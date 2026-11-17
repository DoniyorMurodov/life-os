import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import Header from '../components/Header';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import ProgressBar from '../components/ProgressBar';
import Segmented from '../components/Segmented';
import Field, { FormActions, FormError } from '../components/Field';
import Icon from '../components/Icon';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/defaultData';
import { formatMonth, formatShortDate, monthKey, todayKey } from '../utils/date';
import { formatMoney, moneySummary } from '../utils/calculations';

function TransactionForm({ initial, currency, onSubmit, onCancel, onDelete }) {
  const [form, setForm] = useState(() => ({
    type: initial.type || 'expense',
    amount: initial.amount ? String(initial.amount) : '',
    title: initial.title || '',
    category: initial.category || 'Food',
    date: initial.date || todayKey(),
  }));
  const [error, setError] = useState('');
  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const set = (key) => (e) => {
    setError('');
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const setType = (type) =>
    setForm((f) => ({ ...f, type, category: (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0] }));

  const submit = (e) => {
    e.preventDefault();
    const amount = Number(String(form.amount).replace(/\s/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) return setError('Amount must be a positive number.');
    if (amount > 1e13) return setError('Amount is too large.');
    if (!form.title.trim()) return setError('Please enter a title.');
    if (!form.date) return setError('Please choose a date.');
    onSubmit({ type: form.type, amount, title: form.title.trim(), category: form.category, date: form.date });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Segmented label="Transaction type" options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} value={form.type} onChange={setType} />
      <Field label={`Amount (${currency})`}>
        <input className="input input-lg" type="number" inputMode="decimal" min="0" step="any" value={form.amount} onChange={set('amount')} placeholder="0" />
      </Field>
      <Field label="Title">
        <input className="input" value={form.title} onChange={set('title')} placeholder={form.type === 'income' ? 'e.g. Freelance project' : 'e.g. Lunch'} maxLength={100} />
      </Field>
      <div className="form-row">
        <Field label="Category">
          <select className="input" value={form.category} onChange={set('category')}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={form.date} onChange={set('date')} />
        </Field>
      </div>
      <FormError message={error} />
      <FormActions onCancel={onCancel} submitLabel={initial.id ? 'Save' : 'Add'}>
        {onDelete && <button type="button" className="btn btn-danger-ghost" onClick={onDelete}>Delete</button>}
      </FormActions>
    </form>
  );
}

export default function Money() {
  const { transactions, transactionActions, settings } = useApp();
  const toast = useToast();
  const currency = settings.currency || 'UZS';
  const [month, setMonth] = useState(monthKey());
  const [editing, setEditing] = useState(null);

  const monthly = useMemo(
    () => transactions.filter((t) => !month || t.date?.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')),
    [transactions, month],
  );
  const summary = useMemo(() => moneySummary(monthly), [monthly]);
  const breakdown = useMemo(() => {
    const totals = {};
    monthly.filter((t) => t.type === 'expense').forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + Number(t.amount);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [monthly]);

  const submit = (data) => {
    if (editing.id) transactionActions.update(editing.id, data);
    else transactionActions.add(data);
    toast(editing.id ? 'Transaction updated' : `${data.type === 'income' ? 'Income' : 'Expense'} added`);
    setEditing(null);
  };

  const remove = () => {
    const t = editing;
    transactionActions.remove(t.id);
    setEditing(null);
    toast('Transaction deleted', { action: { label: 'Undo', onClick: () => transactionActions.restore(t) } });
  };

  return (
    <>
      <Header title="Money" subtitle={month ? formatMonth(month) : 'All time'}>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
          <Icon name="plus" size={18} /> Transaction
        </button>
      </Header>

      <div className="toolbar">
        <Field label="Month" className="field-inline">
          <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        <button type="button" className="btn btn-ghost" onClick={() => setMonth(month ? '' : monthKey())}>
          {month ? 'Show all time' : 'This month'}
        </button>
      </div>

      <div className="stat-grid stat-grid-stack stat-grid-3">
        <StatCard icon="arrowDown" label="Income" value={formatMoney(summary.income, currency)} tone="green" />
        <StatCard icon="arrowUp" label="Expenses" value={formatMoney(summary.expense, currency)} tone="red" />
        <StatCard icon="wallet" label="Balance" value={formatMoney(summary.balance, currency)} tone={summary.balance < 0 ? 'red' : 'blue'} />
      </div>

      <div className="grid-2-1">
        <section className="card">
          <div className="card-head"><h2 className="card-title">Transactions</h2><span className="muted small">{monthly.length}</span></div>
          {monthly.length ? (
            <ul className="simple-list">
              {monthly.map((t) => (
                <li key={t.id}>
                  <button type="button" className="tx-row" onClick={() => setEditing(t)}>
                    <span className={`tx-icon ${t.type}`}><Icon name={t.type === 'income' ? 'arrowDown' : 'arrowUp'} size={16} /></span>
                    <span className="tx-main">
                      <span className="tx-title">{t.title}</span>
                      <span className="muted small">{t.category} · {formatShortDate(t.date)}</span>
                    </span>
                    <span className={`tx-amount ${t.type}`}>{t.type === 'income' ? '+' : '−'}{formatMoney(t.amount, currency)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon="wallet" title="No transactions" description="Add your first income or expense." />
          )}
        </section>

        <section className="card">
          <h2 className="card-title">Spending by category</h2>
          {breakdown.length ? (
            <div className="stack list-gap-sm">
              {breakdown.map(([cat, total]) => (
                <div key={cat} className="mini-progress">
                  <div className="mini-progress-head">
                    <span className="mini-progress-name">{cat}</span>
                    <span className="muted small">{formatMoney(total, currency)}</span>
                  </div>
                  <ProgressBar value={total} max={summary.expense} label={`${cat} share of expenses`} />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted small list-gap-sm">No expenses in this period.</p>
          )}
        </section>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit transaction' : 'New transaction'}>
        {editing && <TransactionForm initial={editing} currency={currency} onSubmit={submit} onCancel={() => setEditing(null)} onDelete={editing.id ? remove : undefined} />}
      </Modal>
    </>
  );
}
