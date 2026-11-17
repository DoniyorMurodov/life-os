/* Helpers shared by the serverless functions. Files starting with "_" are not deployed as endpoints. */

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

export function pushConfigured() {
  return !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
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
