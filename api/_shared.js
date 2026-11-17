/* Helpers shared by the serverless functions. Files starting with "_" are not deployed as endpoints. */
import { createECDH, hkdfSync } from 'node:crypto';

export function checkAccessCode(req, res) {
  const required = process.env.APP_ACCESS_CODE;
  if (required && req.headers['x-access-code'] !== required) {
    res.status(401).json({ error: 'invalid_access_code' });
    return false;
  }
  return true;
}

export function readJsonBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
}

/** Raw request body as a string (needed for signature verification). Never touch req.body before this. */
export async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export const clip = (value, max) => String(value ?? '').slice(0, max);

export function isValidSubscription(sub) {
  return (
    sub &&
    typeof sub.endpoint === 'string' &&
    /^https:\/\//.test(sub.endpoint) &&
    sub.endpoint.length < 1000 &&
    typeof sub.keys?.p256dh === 'string' &&
    typeof sub.keys?.auth === 'string'
  );
}

/** P-256 curve order — a private key must be in [1, n-1]. */
const P256_N = BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551');

let cachedVapid;

/**
 * VAPID keys for Web Push. Uses VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY when set; otherwise derives
 * a stable key pair (HKDF) from a server-only secret that already exists on the deployment
 * (VAPID_SEED, or SUPABASE_JWT_SECRET added by the Vercel Supabase integration).
 * Returns null when nothing is available.
 */
export function getVapidKeys() {
  if (cachedVapid !== undefined) return cachedVapid;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    cachedVapid = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    return cachedVapid;
  }
  const seed = process.env.VAPID_SEED || process.env.SUPABASE_JWT_SECRET;
  if (!seed) {
    cachedVapid = null;
    return cachedVapid;
  }
  for (let counter = 0; counter < 16; counter += 1) {
    const priv = Buffer.from(hkdfSync('sha256', seed, 'life-os', `vapid-p256-${counter}`, 32));
    const n = BigInt(`0x${priv.toString('hex')}`);
    if (n === 0n || n >= P256_N) continue;
    const ecdh = createECDH('prime256v1');
    ecdh.setPrivateKey(priv);
    cachedVapid = { publicKey: ecdh.getPublicKey('base64url'), privateKey: priv.toString('base64url') };
    return cachedVapid;
  }
  cachedVapid = null;
  return cachedVapid;
}

export function pushConfigured() {
  return !!(
    getVapidKeys() &&
    process.env.QSTASH_TOKEN &&
    process.env.QSTASH_CURRENT_SIGNING_KEY &&
    process.env.QSTASH_NEXT_SIGNING_KEY
  );
}

/** Public base URL of this deployment (QStash calls back to it). */
export function publicOrigin(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
}
