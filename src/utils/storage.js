/**
 * Central storage layer. Every read/write to LocalStorage goes through here,
 * so swapping to IndexedDB / Firebase / Supabase later only touches this file
 * (and the useLocalStorage hook).
 */

const PREFIX = 'lifeos:';
const EXPORT_VERSION = 1;

/** Keys that belong to the user's data (exported / imported / reset). */
export const STORAGE_KEYS = [
  'tasks',
  'schedule',
  'subjects',
  'studySessions',
  'focusSessions',
  'expenses',
  'notes',
  'goals',
  'settings',
  'streak',
];

/** Internal keys (not exported, but cleared on reset). */
const INTERNAL_KEYS = ['timer', 'sync', 'auth'];

function storageAvailable() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function reportError(error) {
  console.warn('[Life OS] storage error:', error);
  try {
    window.dispatchEvent(new CustomEvent('lifeos:storage-error', { detail: String(error) }));
  } catch {
    /* ignore */
  }
}

export const fullKey = (key) => PREFIX + key;

/**
 * Read a value. If missing, corrupted, or rejected by `normalize`,
 * the fallback is returned instead (never throws).
 */
export function getData(key, fallback, normalize) {
  const resolveFallback = () => (typeof fallback === 'function' ? fallback() : fallback);
  if (!storageAvailable()) return resolveFallback();
  try {
    const raw = window.localStorage.getItem(fullKey(key));
    if (raw === null) return resolveFallback();
    const parsed = JSON.parse(raw);
    if (!normalize) return parsed;
    const normalized = normalize(parsed);
    return normalized === undefined ? resolveFallback() : normalized;
  } catch (error) {
    console.warn(`[Life OS] invalid data for "${key}", using defaults.`, error);
    return resolveFallback();
  }
}

/**
 * Write a value. Returns true only if something actually changed.
 * Non-silent writes of user data fire "lifeos:local-change" (cloud sync listens to it).
 */
export function setData(key, value, { silent = false } = {}) {
  if (!storageAvailable()) return false;
  try {
    const json = JSON.stringify(value);
    const storageKey = fullKey(key);
    if (window.localStorage.getItem(storageKey) === json) return false;
    window.localStorage.setItem(storageKey, json);
    if (!silent && STORAGE_KEYS.includes(key)) {
      window.dispatchEvent(new CustomEvent('lifeos:local-change', { detail: { key } }));
    }
    return true;
  } catch (error) {
    reportError(error);
    return false;
  }
}

/** Tell mounted React state that storage was changed from outside React (e.g. cloud sync). */
export function emitExternalChange(key) {
  window.dispatchEvent(new CustomEvent('lifeos:external-change', { detail: { key } }));
}

export function removeData(key) {
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(fullKey(key));
  } catch (error) {
    reportError(error);
  }
}

/** Short unique id that also works on non-secure (http) origins. */
export function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- normalizers (validation of stored data) ---------- */

export function normalizeList(value) {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item) => item && typeof item === 'object' && typeof item.id === 'string');
}

export function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

/**
 * Asks the browser to never auto-evict this app's storage (Android Chrome grants it
 * silently for installed / frequently used apps). Returns true when storage is protected.
 */
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/* ---------- export / import / reset ---------- */

export function exportAllData() {
  const data = {};
  STORAGE_KEYS.forEach((key) => {
    const value = getData(key, null);
    if (value === null) return;
    // The AI access code is a per-device secret — keep it out of backup files.
    data[key] = key === 'settings' ? { ...value, aiAccessCode: '' } : value;
  });
  return { app: 'life-os', version: EXPORT_VERSION, exportedAt: new Date().toISOString(), data };
}

export function downloadJSON(object, filename) {
  const blob = new Blob([JSON.stringify(object, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Validates and writes an exported backup. Returns the number of keys restored.
 * Throws a readable Error if the file is not a valid Life OS backup.
 */
export function importAllData(json) {
  if (!json || json.app !== 'life-os' || !normalizeObject(json.data)) {
    throw new Error('This file is not a Life OS backup.');
  }
  let restored = 0;
  STORAGE_KEYS.forEach((key) => {
    if (!(key in json.data)) return;
    const value = json.data[key];
    const valid = key === 'settings' || key === 'streak' ? normalizeObject(value) : normalizeList(value);
    if (valid === undefined) throw new Error(`Backup field "${key}" is invalid.`);
    setData(key, valid);
    restored += 1;
  });
  if (!restored) throw new Error('Backup file contains no data.');
  return restored;
}

export function resetAllData() {
  [...STORAGE_KEYS, ...INTERNAL_KEYS].forEach(removeData);
}
