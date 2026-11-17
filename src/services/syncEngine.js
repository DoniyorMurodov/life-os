/**
 * Cloud sync engine (Supabase). Pure logic: the Supabase client is passed in.
 *
 * Model: one row per record in table `lifeos_records`
 *   (user_id, collection, id, data jsonb, deleted bool, updated_at timestamptz — set by the server).
 *
 * Each sync:
 *   1. PUSH  — compare local data with the "shadow" (last state known to be in the cloud);
 *              upsert new/changed records, write tombstones for deleted ones.
 *   2. PULL  — fetch rows changed since the last pull and apply them locally.
 * Conflicts resolve as last-write-wins per record (server time).
 */
import { emitExternalChange, getData, normalizeList, normalizeObject, removeData, setData } from '../utils/storage';

/** JSON with sorted keys — Postgres jsonb does not keep key order. */
export function canon(value) {
  if (Array.isArray(value)) return `[${value.map(canon).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().filter((k) => value[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canon(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export const TABLE = 'lifeos_records';
export const LIST_COLLECTIONS = ['tasks', 'schedule', 'subjects', 'studySessions', 'focusSessions', 'expenses', 'notes', 'goals'];
const SETTINGS_FIELDS = ['name', 'currency', 'theme'];
const SINGLE_ID = 'main';
const PAGE = 1000;
const OVERLAP_MS = 10000; // re-read a small window to never miss concurrent commits

/* ---------- local sync state (shadow) ---------- */

const emptyState = (userId) => ({ userId, lastPulledAt: null, shadow: {} });

export function loadSyncState() {
  return getData('sync', null, normalizeObject);
}

function saveSyncState(state) {
  setData('sync', state, { silent: true });
}

export function clearSyncState() {
  removeData('sync');
}

/* ---------- local snapshot: { collection: { id: jsonString } } ---------- */

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));

function localSnapshot() {
  const snap = {};
  LIST_COLLECTIONS.forEach((col) => {
    snap[col] = {};
    (getData(col, [], normalizeList) || []).forEach((item) => {
      snap[col][item.id] = canon(item);
    });
  });
  const settings = getData('settings', null, normalizeObject);
  snap.settings = settings ? { [SINGLE_ID]: canon(pick(settings, SETTINGS_FIELDS)) } : {};
  const streak = getData('streak', null, normalizeObject);
  snap.streak = streak?.days?.length ? { [SINGLE_ID]: canon({ days: streak.days }) } : {};
  return snap;
}

export function hasLocalData() {
  return LIST_COLLECTIONS.some((col) => (getData(col, [], normalizeList) || []).length > 0);
}

/* ---------- remote helpers ---------- */

async function remoteHasData(client, userId) {
  const { count, error } = await client
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('deleted', false);
  if (error) throw error;
  return (count || 0) > 0;
}

async function pushChanges(client, userId, state, snap) {
  const rows = [];
  const allCollections = new Set([...Object.keys(snap), ...Object.keys(state.shadow)]);
  allCollections.forEach((col) => {
    const local = snap[col] || {};
    const shadow = state.shadow[col] || {};
    Object.entries(local).forEach(([id, json]) => {
      if (shadow[id] !== json) rows.push({ user_id: userId, collection: col, id, data: JSON.parse(json), deleted: false });
    });
    Object.keys(shadow).forEach((id) => {
      if (!(id in local)) rows.push({ user_id: userId, collection: col, id, data: null, deleted: true });
    });
  });

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await client.from(TABLE).upsert(chunk, { onConflict: 'user_id,collection,id' });
    if (error) throw error;
    chunk.forEach((row) => {
      state.shadow[row.collection] ||= {};
      if (row.deleted) delete state.shadow[row.collection][row.id];
      else state.shadow[row.collection][row.id] = canon(row.data);
    });
  }
  return rows.length;
}

async function fetchChanges(client, userId, since) {
  const all = [];
  for (let from = 0; ; from += PAGE) {
    let query = client.from(TABLE).select('collection,id,data,deleted,updated_at').eq('user_id', userId);
    if (since) query = query.gte('updated_at', since);
    const { data, error } = await query.order('updated_at', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

/** Applies remote rows to local storage. `replace` = make local exactly match the remote set. */
function applyRemote(rows, state, { replace = false } = {}) {
  const byCol = {};
  rows.forEach((row) => {
    (byCol[row.collection] ||= []).push(row);
  });

  LIST_COLLECTIONS.forEach((col) => {
    const changes = byCol[col] || [];
    if (!changes.length && !replace) return;
    const current = replace ? [] : getData(col, [], normalizeList) || [];
    const map = new Map(current.map((item) => [item.id, item]));
    const order = current.map((item) => item.id);
    state.shadow[col] ||= {};
    if (replace) state.shadow[col] = {};

    changes.forEach((row) => {
      if (row.deleted) {
        map.delete(row.id);
        delete state.shadow[col][row.id];
      } else if (row.data && typeof row.data === 'object') {
        const record = { ...row.data, id: row.id };
        if (!map.has(row.id)) order.push(row.id);
        map.set(row.id, record);
        state.shadow[col][row.id] = canon(record);
      }
    });

    const next = order.filter((id) => map.has(id)).map((id) => map.get(id));
    if (setData(col, next, { silent: true })) emitExternalChange(col);
  });

  const settingsRow = (byCol.settings || []).filter((r) => r.id === SINGLE_ID && !r.deleted).pop();
  if (settingsRow?.data) {
    const local = getData('settings', {}, normalizeObject) || {};
    const merged = { ...local, ...pick(settingsRow.data, SETTINGS_FIELDS) };
    if (setData('settings', merged, { silent: true })) emitExternalChange('settings');
    state.shadow.settings = { [SINGLE_ID]: canon(pick(merged, SETTINGS_FIELDS)) };
  }

  const streakRow = (byCol.streak || []).filter((r) => r.id === SINGLE_ID && !r.deleted).pop();
  if (Array.isArray(streakRow?.data?.days)) {
    const local = getData('streak', { days: [] }, normalizeObject) || { days: [] };
    // Streak history is merged (union), never overwritten.
    const days = [...new Set([...(local.days || []), ...streakRow.data.days])].sort();
    if (setData('streak', { days }, { silent: true })) emitExternalChange('streak');
    // Shadow keeps the remote version so a union with new local days gets pushed next time.
    state.shadow.streak = { [SINGLE_ID]: canon({ days: streakRow.data.days }) };
  }
}

const maxUpdatedAt = (rows, fallback) =>
  rows.reduce((max, r) => (r.updated_at > (max || '') ? r.updated_at : max), fallback);

/**
 * Runs one sync. Returns:
 *   { status: 'synced', pushed, pulled }
 *   { status: 'needs_choice' }  — first sync on this device and the cloud already has data:
 *                                 call again with firstLinkMode 'cloud' or 'merge'.
 */
export async function runSync(client, userId, { firstLinkMode } = {}) {
  let state = loadSyncState();
  const firstLink = !state || state.userId !== userId;

  if (firstLink) {
    state = emptyState(userId);
    if (!firstLinkMode && (await remoteHasData(client, userId))) {
      // Empty device, or one that hasn't finished onboarding (new phone) → just take the cloud data.
      const onboarded = getData('settings', null, normalizeObject)?.onboarded;
      if (!hasLocalData() || !onboarded) firstLinkMode = 'cloud';
      else return { status: 'needs_choice' };
    }
    if (firstLinkMode === 'cloud') {
      const rows = (await fetchChanges(client, userId, null)).filter((r) => !r.deleted);
      applyRemote(rows, state, { replace: true });
      state.lastPulledAt = maxUpdatedAt(rows, null);
      saveSyncState(state);
      return { status: 'synced', pushed: 0, pulled: rows.length };
    }
  }

  const pushed = await pushChanges(client, userId, state, localSnapshot());
  saveSyncState(state); // persist push progress even if the pull fails

  const since = state.lastPulledAt ? new Date(new Date(state.lastPulledAt).getTime() - OVERLAP_MS).toISOString() : null;
  const rows = await fetchChanges(client, userId, since);
  // Skip rows we already have in exactly this state (our own pushes / overlap window).
  const fresh = rows.filter((r) => {
    const known = state.shadow[r.collection]?.[r.id];
    return r.deleted ? known !== undefined : known !== canon(r.collection === 'settings' || r.collection === 'streak' ? r.data : { ...r.data, id: r.id });
  });
  applyRemote(fresh, state);
  state.lastPulledAt = maxUpdatedAt(rows, state.lastPulledAt);
  saveSyncState(state);

  // Merges (streak union) can create new local state — send it right away.
  const pushedAfterMerge = fresh.length ? await pushChanges(client, userId, state, localSnapshot()) : 0;
  if (pushedAfterMerge) saveSyncState(state);

  return { status: 'synced', pushed: pushed + pushedAfterMerge, pulled: fresh.length };
}
