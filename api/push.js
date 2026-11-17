/**
 * Focus-timer push notifications that arrive even when the app is closed.
 *
 *   GET  /api/push                      → { enabled, publicKey }
 *   POST /api/push { action: 'schedule', subscription, fireAt, title, body } → { messageId }
 *   POST /api/push { action: 'cancel', messageId }                         → { ok }
 *
 * Scheduling uses Upstash QStash: it calls /api/push-send at `fireAt`, which sends the Web Push.
 * Env (Vercel): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY,
 *               QSTASH_NEXT_SIGNING_KEY, optional QSTASH_URL, optional APP_ACCESS_CODE.
 */
import { Client } from '@upstash/qstash';
import { checkAccessCode, clip, isValidSubscription, publicOrigin, pushConfigured, readJsonBody } from './_shared.js';

const MAX_DELAY_MS = 6 * 60 * 60 * 1000; // a timer phase is at most a few hours

const qstash = () =>
  new Client({ token: process.env.QSTASH_TOKEN, ...(process.env.QSTASH_URL ? { baseUrl: process.env.QSTASH_URL } : {}) });

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ enabled: pushConfigured(), publicKey: process.env.VAPID_PUBLIC_KEY || null });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAccessCode(req, res)) return undefined;
  if (!pushConfigured()) return res.status(503).json({ error: 'push_not_configured' });

  let body;
  try {
    body = readJsonBody(req);
  } catch {
    return res.status(400).json({ error: 'invalid_json' });
  }

  try {
    if (body.action === 'schedule') {
      const fireAt = Number(body.fireAt);
      const now = Date.now();
      if (!isValidSubscription(body.subscription)) return res.status(400).json({ error: 'invalid_subscription' });
      if (!Number.isFinite(fireAt) || fireAt < now - 60000 || fireAt > now + MAX_DELAY_MS) {
        return res.status(400).json({ error: 'invalid_time' });
      }
      const result = await qstash().publishJSON({
        url: `${publicOrigin(req)}/api/push-send`,
        body: {
          subscription: body.subscription,
          title: clip(body.title, 80) || 'Life OS',
          body: clip(body.body, 200),
        },
        notBefore: Math.ceil(fireAt / 1000),
        retries: 2,
      });
      return res.status(200).json({ messageId: result.messageId });
    }

    if (body.action === 'cancel') {
      const id = clip(body.messageId, 200);
      if (!id) return res.status(400).json({ error: 'missing_message_id' });
      try {
        await qstash().messages.delete(id);
      } catch {
        /* already delivered or unknown — nothing to cancel */
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'unknown_action' });
  } catch (error) {
    console.error('push handler error', error);
    return res.status(502).json({ error: 'push_error' });
  }
}
