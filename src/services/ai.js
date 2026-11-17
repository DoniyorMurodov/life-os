/**
 * AI planning service.
 *
 * Online + deployed on Vercel → calls /api/plan (api/plan.js), which talks to Claude
 * with the API key stored as a server-side environment variable.
 * Offline, not configured, or any error → falls back to the local rule-based planner.
 *
 * NEVER put an API key in frontend code or in a VITE_* variable — it ships to every visitor.
 */
import { minutesToTime } from '../utils/date';
import { compareTasks } from '../utils/calculations';

const ENDPOINT = import.meta.env.VITE_AI_ENDPOINT || `${import.meta.env.BASE_URL}api/plan`;

const NOTICES = {
  invalid_access_code: 'AI access code is wrong — check Settings → AI access code.',
  ai_not_configured: '', // no API key is a normal, free setup — use the offline planner silently
  rate_limited: 'Cloud AI is busy right now — try again in a minute.',
  refused: 'Cloud AI declined this request.',
};

export async function generatePlan(prompt, context, { accessCode = '' } = {}) {
  let notice = navigator.onLine ? '' : 'You are offline — using the offline planner.';

  if (navigator.onLine) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessCode ? { 'x-access-code': accessCode } : {}) },
        body: JSON.stringify({ prompt, context: toRemoteContext(context) }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json() : null;
      if (res.ok && Array.isArray(data?.blocks)) return { ...data, source: 'remote' };
      // Non-JSON response = no server function (local preview / GitHub Pages): silent fallback.
      if (data?.error) notice = NOTICES[data.error] ?? 'Cloud AI failed — using the offline planner.';
    } catch (error) {
      notice = error.name === 'AbortError' ? 'Cloud AI took too long — using the offline planner.' : '';
      console.warn('[Life OS] AI endpoint unavailable, using local planner.', error);
    }
  }
  return { ...localPlan(prompt, context), notice };
}

/**
 * Ready-to-paste prompt for claude.ai — lets the user plan with their own Claude
 * account (free or subscription) without any API key.
 */
export function buildClaudePrompt(prompt, context) {
  const { now, tasks, subjects } = toRemoteContext(context);
  const taskLines = tasks.length
    ? tasks.map((t) => `- ${t.title} (priority: ${t.priority}, ${t.category}${t.deadline ? `, deadline: ${t.deadline}` : ''})`).join('\n')
    : '- (no pending tasks)';
  const subjectLines = subjects.length
    ? subjects.map((s) => `- ${s.name}: ${s.weeklyProgressPercent}% of weekly study goal`).join('\n')
    : '- (no subjects)';
  return `${prompt || 'Help me plan the rest of my day.'}

Please make me a realistic time-blocked plan (start–end times, 24h format) for the time I have.
Put overdue and high-priority tasks first, then the subjects furthest behind their weekly goal,
with a 5–10 min break every 45–60 min. Answer in the same language as my request above.

Current time: ${now}

My pending tasks:
${taskLines}

My study subjects this week:
${subjectLines}`;
}

/** Only what the planner needs leaves the device. */
function toRemoteContext({ tasks = [], subjects = [], subjectStats = {} }) {
  return {
    now: new Date().toString(),
    tasks: tasks
      .filter((t) => !t.completed)
      .sort(compareTasks)
      .slice(0, 20)
      .map(({ title, priority, category, deadline }) => ({ title, priority, category, deadline })),
    subjects: subjects.map((s) => ({ name: s.name, weeklyProgressPercent: subjectStats[s.id]?.percent ?? 0 })),
  };
}

/* ---------------- local rule-based planner ---------------- */

export function parseAvailableMinutes(text) {
  const t = text.toLowerCase().replace(',', '.');
  let minutes = 0;
  const hours = t.match(/(\d+(?:\.\d+)?)\s*(soat|hours?|hrs?|h\b|час)/);
  const mins = t.match(/(\d+)\s*(daqiqa|minut|minutes?|mins?|min\b|m\b)/);
  if (hours) minutes += parseFloat(hours[1]) * 60;
  if (mins) minutes += parseInt(mins[1], 10);
  if (!minutes) {
    const bare = t.match(/\b(\d+(?:\.\d+)?)\b/);
    if (bare) {
      const n = parseFloat(bare[1]);
      minutes = n <= 12 ? n * 60 : n;
    }
  }
  return Math.min(12 * 60, Math.max(30, Math.round(minutes || 120)));
}

function parseStartTime(text) {
  const m = text.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const now = new Date();
  return Math.ceil((now.getHours() * 60 + now.getMinutes() + 5) / 15) * 15;
}

const TASK_MINUTES = { high: 50, medium: 40, low: 25 };

function localPlan(prompt, { tasks = [], subjects = [], subjectStats = {} }) {
  const available = parseAvailableMinutes(prompt);
  let cursor = parseStartTime(prompt);
  const end = cursor + available;
  const blocks = [];
  let sinceBreak = 0;

  const push = (title, minutes, type) => {
    const length = Math.min(minutes, end - cursor);
    if (length < 10) return false;
    blocks.push({ start: minutesToTime(cursor), end: minutesToTime(cursor + length), title, type });
    cursor += length;
    return true;
  };

  const work = (title, minutes, type) => {
    if (sinceBreak >= 50 && end - cursor > 25) {
      push('Break — stretch, water, no phone', 10, 'break');
      sinceBreak = 0;
    }
    const ok = push(title, minutes, type);
    if (ok) sinceBreak += minutes;
    return ok;
  };

  const queue = [
    ...tasks.filter((t) => !t.completed).sort(compareTasks).slice(0, 4).map((t) => ({
      title: t.title,
      minutes: TASK_MINUTES[t.priority] || 40,
      type: 'task',
    })),
    ...[...subjects]
      .sort((a, b) => (subjectStats[a.id]?.percent ?? 0) - (subjectStats[b.id]?.percent ?? 0))
      .map((s) => ({ title: `${s.name} study session`, minutes: 45, type: 'study' })),
  ];

  for (const item of queue) {
    if (end - cursor < 15) break;
    work(item.title, item.minutes, item.type);
  }
  if (end - cursor >= 15) work('Review the day & plan tomorrow', Math.min(20, end - cursor), 'review');

  const hours = Math.floor(available / 60);
  const rest = available % 60;
  const label = `${hours ? `${hours}h` : ''}${rest ? ` ${rest}m` : ''}`.trim();
  return {
    source: 'local',
    summary: `Here is a focused ${label} plan. High-priority tasks first, then the subjects that are furthest behind this week, with short breaks every ~50 minutes.`,
    blocks,
  };
}
