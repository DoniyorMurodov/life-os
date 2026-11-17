import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import Header from '../components/Header';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Field, { FormActions, FormError } from '../components/Field';
import Icon from '../components/Icon';
import { formatShortDate } from '../utils/date';

function NoteForm({ initial, onSubmit, onCancel, onDelete }) {
  const [title, setTitle] = useState(initial.title || '');
  const [content, setContent] = useState(initial.content || '');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return setError('Write a title or some content.');
    onSubmit({ title: title.trim() || 'Untitled', content: content.trim() });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Title">
        <input className="input" value={title} onChange={(e) => { setError(''); setTitle(e.target.value); }} placeholder="Note title" maxLength={150} />
      </Field>
      <Field label="Content">
        <textarea className="input textarea" rows={10} value={content} onChange={(e) => { setError(''); setContent(e.target.value); }} placeholder="Write anything…" />
      </Field>
      {initial.createdAt && <p className="muted small">Created {new Date(initial.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
      <FormError message={error} />
      <FormActions onCancel={onCancel} submitLabel={initial.id ? 'Save' : 'Create note'}>
        {onDelete && <button type="button" className="btn btn-danger-ghost" onClick={onDelete}>Delete</button>}
      </FormActions>
    </form>
  );
}

export default function Notes() {
  const { notes, noteActions } = useApp();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => !q || `${n.title || ''} ${n.content || ''}`.toLowerCase().includes(q))
      .sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
  }, [notes, query]);

  const submit = (data) => {
    const stamp = new Date().toISOString();
    if (editing.id) noteActions.update(editing.id, { ...data, updatedAt: stamp });
    else noteActions.add({ ...data, updatedAt: stamp });
    toast(editing.id ? 'Note saved' : 'Note created');
    setEditing(null);
  };

  const remove = () => {
    const note = editing;
    noteActions.remove(note.id);
    setEditing(null);
    toast('Note deleted', { action: { label: 'Undo', onClick: () => noteActions.restore(note) } });
  };

  return (
    <>
      <Header title="Notes" subtitle={`${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
          <Icon name="plus" size={18} /> New note
        </button>
      </Header>

      {notes.length > 0 && (
        <div className="toolbar">
          <div className="search">
            <Icon name="search" size={18} />
            <input type="search" className="input" placeholder="Search notes" aria-label="Search notes" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
      )}

      {visible.length ? (
        <div className="card-grid">
          {visible.map((n) => (
            <button key={n.id} type="button" className="card note-card" onClick={() => setEditing(n)}>
              <span className="note-title">{n.title}</span>
              <span className="note-snippet">{n.content || 'No content'}</span>
              <span className="muted small">{formatShortDate(n.updatedAt || n.createdAt)}</span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="note"
          title={notes.length ? 'No matching notes' : 'No notes yet'}
          description={notes.length ? 'Try another search.' : 'Capture ideas, vocabulary or plans.'}
          action={!notes.length && <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>Write a note</button>}
        />
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit note' : 'New note'} size="lg">
        {editing && <NoteForm initial={editing} onSubmit={submit} onCancel={() => setEditing(null)} onDelete={editing.id ? remove : undefined} />}
      </Modal>
    </>
  );
}
