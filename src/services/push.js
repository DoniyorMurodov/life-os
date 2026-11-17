/**
 * Background (closed-app) notifications for the focus timer.
 * The server (api/push.js) schedules a Web Push via Upstash QStash for the moment the timer ends.
 */
const API = `${import.meta.env.BASE_URL}api/push`;

let configPromise = null;

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** { enabled, publicKey } — enabled=false when the server has no push env vars (or no server at all). */
export function getPushConfig() {
  if (!configPromise) {
    configPromise = fetch(API, { headers: { Accept: 'application/json' } })
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : { enabled: false }))
      .catch(() => {
        configPromise = null; // retry next time (maybe we were offline)
        return { enabled: false };
      });
  }
  return configPromise;
}

function base64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function getSubscription(publicKey) {
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(publicKey) });
}

/** Status for the Settings screen. */
export async function getPushStatus() {
  if (!pushSupported()) return 'unsupported';
  const config = await getPushConfig();
  if (!config.enabled) return 'not_configured';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'needs_permission';
  return 'ready';
}

async function post(body, accessCode) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(accessCode ? { 'x-access-code': accessCode } : {}) },
    body: JSON.stringify(body),
  });
  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : {};
  if (!res.ok) throw new Error(data.error || `push_http_${res.status}`);
  return data;
}

/** Returns the scheduled message id, or null when push is unavailable. Never throws. */
export async function schedulePush({ fireAt, title, body, accessCode }) {
  try {
    if (!navigator.onLine || (await getPushStatus()) !== 'ready') return null;
    const { publicKey } = await getPushConfig();
    const subscription = await getSubscription(publicKey);
    const data = await post({ action: 'schedule', subscription: subscription.toJSON(), fireAt, title, body }, accessCode);
    return data.messageId || null;
  } catch (error) {
    console.warn('[Life OS] could not schedule push', error);
    return null;
  }
}

export async function cancelPush(messageId, accessCode) {
  if (!messageId) return;
  try {
    await post({ action: 'cancel', messageId }, accessCode);
  } catch (error) {
    console.warn('[Life OS] could not cancel push', error);
  }
}
