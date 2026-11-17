/**
 * Vercel Serverless Function: POST /api/plan
 *
 * Generates a daily plan with Claude. The API key lives ONLY here, on the server,
 * as the Vercel environment variable ANTHROPIC_API_KEY — it never reaches the browser.
 *
 * Optional protection: set APP_ACCESS_CODE in Vercel. Then only devices where you
 * entered the same code in Settings → AI access code can use your API key.
 */
import Anthropic from '@anthropic-ai/sdk';

export const config = { maxDuration: 60 };

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          start: { type: 'string', description: 'HH:MM, 24h' },
          end: { type: 'string', description: 'HH:MM, 24h' },
          title: { type: 'string' },
          type: { type: 'string', enum: ['task', 'study', 'break', 'review'] },
        },
        required: ['start', 'end', 'title', 'type'],
        additionalProperties: false,
      },
    },
  },
  required: ['summary', 'blocks'],
  additionalProperties: false,
};

const SYSTEM = `You are the planning assistant inside "Life OS", a personal productivity app used by a student.
Build a realistic time-blocked plan for the time the user says they have.
- Respect the available time and any start time the user mentions; otherwise start at the given current time, rounded up to the next 5 minutes.
- Prioritize overdue and high-priority pending tasks, then the study subjects that are furthest behind their weekly target.
- Insert short breaks (5–10 min) roughly every 45–60 minutes of work.
- Use the user's language (Uzbek, English or Russian) for the summary and block titles.
- Keep the summary to 1–2 sentences.`;

const clip = (value, max) => String(value ?? '').slice(0, max);

function sanitizeContext(context = {}) {
  const tasks = Array.isArray(context.tasks) ? context.tasks : [];
  const subjects = Array.isArray(context.subjects) ? context.subjects : [];
  return {
    now: clip(context.now, 40),
    tasks: tasks.slice(0, 20).map((t) => ({
      title: clip(t.title, 120),
      priority: clip(t.priority, 10),
      category: clip(t.category, 20),
      deadline: clip(t.deadline, 10),
    })),
    subjects: subjects.slice(0, 15).map((s) => ({
      name: clip(s.name, 60),
      weeklyProgressPercent: Number(s.weeklyProgressPercent) || 0,
    })),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const requiredCode = process.env.APP_ACCESS_CODE;
  if (requiredCode && req.headers['x-access-code'] !== requiredCode) {
    return res.status(401).json({ error: 'invalid_access_code' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ai_not_configured' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const prompt = clip(body.prompt, 500).trim();
  if (!prompt) return res.status(400).json({ error: 'empty_prompt' });
  const context = sanitizeContext(body.context);

  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: PLAN_SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `User request: ${prompt}\n\nApp data (JSON):\n${JSON.stringify(context)}`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') return res.status(422).json({ error: 'refused' });
    const text = response.content.find((b) => b.type === 'text')?.text;
    if (!text) return res.status(502).json({ error: 'empty_response' });

    const plan = JSON.parse(text);
    return res.status(200).json({ summary: plan.summary, blocks: plan.blocks.slice(0, 30) });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'rate_limited' });
    if (error instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: 'ai_not_configured' });
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API error', error.status, error.message);
      return res.status(502).json({ error: 'ai_error' });
    }
    console.error('plan handler error', error);
    return res.status(500).json({ error: 'server_error' });
  }
}
