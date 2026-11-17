/**
 * Called ONLY by Upstash QStash at the scheduled time. Verifies the QStash signature,
 * then delivers the Web Push notification to the user's device.
 */
import { Receiver } from '@upstash/qstash';
import * as webpush from 'web-push';
import { clip, isValidSubscription, pushConfigured, readRawBody } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!pushConfigured()) return res.status(503).json({ error: 'push_not_configured' });

  const raw = await readRawBody(req);
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  });
  const signature = req.headers['upstash-signature'];
  const valid = signature && (await receiver.verify({ signature, body: raw }).catch(() => false));
  if (!valid) return res.status(401).json({ error: 'invalid_signature' });

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return res.status(400).json({ error: 'invalid_json' });
  }
  if (!isValidSubscription(payload.subscription)) return res.status(400).json({ error: 'invalid_subscription' });

  return sendPush(payload, res);
}

export async function sendPush({ subscription, title, body }, res) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:life-os@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title: clip(title, 80) || 'Life OS', body: clip(body, 200), tag: 'lifeos-focus', url: '/focus' }),
      { TTL: 600, urgency: 'high' },
    );
    return res.status(200).json({ ok: true });
  } catch (error) {
    // 404/410: subscription expired — tell QStash not to retry.
    if (error.statusCode === 404 || error.statusCode === 410) return res.status(200).json({ ok: false, gone: true });
    console.error('web-push error', error.statusCode, error.body);
    return res.status(502).json({ error: 'push_failed' });
  }
}
