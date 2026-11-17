import { useId, useState } from 'react';
import { useApp } from '../context/AppContext';
import { buildClaudePrompt, generatePlan } from '../services/ai';
import { useToast } from './Toast';
import { getSubjectStats } from '../utils/calculations';
import Icon from './Icon';

const TYPE_LABEL = { task: 'Task', study: 'Study', break: 'Break', review: 'Review' };

export default function AIAssistant() {
  const { tasks, subjects, studySessions, settings } = useApp();
  const inputId = useId();
  const [prompt, setPrompt] = useState('');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const [manualPrompt, setManualPrompt] = useState('');
  const toast = useToast();

  const context = () => ({
    tasks,
    subjects,
    subjectStats: Object.fromEntries(subjects.map((s) => [s.id, getSubjectStats(s, studySessions)])),
  });

  const submit = async (e) => {
    e.preventDefault();
    const text = prompt.trim() || 'I have 2 hours today';
    setLoading(true);
    try {
      setPlan(await generatePlan(text, context(), { accessCode: settings.aiAccessCode }));
    } finally {
      setLoading(false);
    }
  };

  // Free option: plan with the user's own Claude account — copy the prompt, open claude.ai.
  // Both calls start synchronously inside the click so browsers allow them.
  const openInClaude = () => {
    const text = buildClaudePrompt(prompt.trim(), context());
    const tab = window.open('https://claude.ai/new', '_blank');
    if (tab) tab.opener = null;
    const copied = navigator.clipboard?.writeText(text) ?? Promise.reject(new Error('no clipboard'));
    copied
      .then(() => {
        setManualPrompt('');
        toast(tab ? 'Prompt copied — paste it in Claude and send.' : 'Prompt copied — open claude.ai and paste it.', { type: 'info', duration: 6000 });
      })
      .catch(() => {
        // Clipboard blocked: show the text so it can be copied by hand.
        setManualPrompt(text);
      });
  };

  return (
    <section className="card ai-card" aria-labelledby={`${inputId}-title`}>
      <div className="card-head">
        <h2 className="card-title" id={`${inputId}-title`}>
          <Icon name="sparkles" size={18} /> AI Assistant
        </h2>
        {plan && (
          <span className={`badge ${plan.source === 'remote' ? 'badge-accent' : ''}`}>
            {plan.source === 'remote' ? 'Claude AI' : 'Offline planner'}
          </span>
        )}
      </div>

      <form className="ai-form" onSubmit={submit}>
        <label htmlFor={inputId} className="sr-only">Describe your available time</label>
        <input
          id={inputId}
          className="input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Bugun 3 soat vaqtim bor, menga reja tuz."
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <Icon name="sparkles" size={16} /> {loading ? 'Planning…' : 'Generate Plan'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={openInClaude}>
          <Icon name="upload" size={16} /> Open in Claude
        </button>
      </form>
      <p className="muted small ai-hint">
        “Open in Claude” copies a ready prompt with your tasks and opens claude.ai — free with your own Claude account.
      </p>

      {manualPrompt && (
        <div className="ai-result">
          <p className="small notice">Copy this text and paste it into Claude:</p>
          <textarea className="input textarea" rows={8} readOnly value={manualPrompt} onFocus={(e) => e.target.select()} aria-label="Prompt for Claude" />
        </div>
      )}

      {plan && (
        <div className="ai-result">
          {plan.notice && <p className="small notice">{plan.notice}</p>}
          <p className="muted">{plan.summary}</p>
          <ol className="timeline">
            {plan.blocks.map((b, i) => (
              <li key={i} className={`timeline-item type-${b.type}`}>
                <span className="timeline-time">{b.start}–{b.end}</span>
                <span className="timeline-title">{b.title}</span>
                <span className="badge">{TYPE_LABEL[b.type] || b.type}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
