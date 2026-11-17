import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import Header from '../components/Header';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Segmented from '../components/Segmented';
import EventForm from '../components/EventForm';
import Icon from '../components/Icon';
import { formatDuration, timeToMinutes, WEEKDAY_LONG, WEEKDAY_ORDER, WEEKDAY_SHORT } from '../utils/date';

const byStart = (a, b) => a.start.localeCompare(b.start);

function EventItem({ event, status, onEdit, onDelete }) {
  const duration = event.end ? timeToMinutes(event.end) - timeToMinutes(event.start) : 0;
  return (
    <div className={`event-card cat-${event.category.toLowerCase()} ${status || ''}`}>
      <div className="event-card-time">
        <span>{event.start}</span>
        {event.end && <span className="muted small">{event.end}</span>}
      </div>
      <div className="event-card-body">
        <p className="event-card-title">{event.title}</p>
        <p className="muted small">
          {event.category}
          {duration > 0 && ` · ${formatDuration(duration)}`}
          {status === 'is-now' && ' · happening now'}
        </p>
      </div>
      <div className="row-actions">
        <button type="button" className="icon-btn" aria-label={`Edit ${event.title}`} onClick={() => onEdit(event)}>
          <Icon name="edit" size={18} />
        </button>
        {onDelete && (
          <button type="button" className="icon-btn danger" aria-label={`Delete ${event.title}`} onClick={() => onDelete(event)}>
            <Icon name="trash" size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Schedule() {
  const { schedule, scheduleActions } = useApp();
  const toast = useToast();
  const [view, setView] = useState('Today');
  const [editing, setEditing] = useState(null);

  const now = new Date();
  const today = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const byDay = useMemo(() => {
    const map = {};
    WEEKDAY_ORDER.forEach((d) => {
      map[d] = schedule.filter((e) => e.days?.includes(d)).sort(byStart);
    });
    return map;
  }, [schedule]);

  const statusOf = (event) => {
    const start = timeToMinutes(event.start);
    const end = timeToMinutes(event.end) ?? start + 60;
    if (nowMinutes >= end) return 'is-past';
    if (nowMinutes >= start) return 'is-now';
    return '';
  };

  const remove = (event) => {
    scheduleActions.remove(event.id);
    setEditing(null);
    toast('Event deleted', { action: { label: 'Undo', onClick: () => scheduleActions.restore(event) } });
  };

  const submit = (data) => {
    if (editing?.id) scheduleActions.update(editing.id, data);
    else scheduleActions.add(data);
    toast(editing?.id ? 'Event updated' : 'Event added');
    setEditing(null);
  };

  return (
    <>
      <Header title="Schedule" subtitle={WEEKDAY_LONG[today]}>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
          <Icon name="plus" size={18} /> New event
        </button>
      </Header>

      <Segmented label="Schedule view" options={['Today', 'Week']} value={view} onChange={setView} />

      {view === 'Today' ? (
        <div className="stack-sm list-gap">
          {byDay[today].map((e) => (
            <EventItem key={e.id} event={e} status={statusOf(e)} onEdit={setEditing} onDelete={remove} />
          ))}
          {!byDay[today].length && (
            <EmptyState
              icon="calendar"
              title="Nothing scheduled today"
              description="Add your classes, study blocks and routines."
              action={
                <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
                  <Icon name="plus" size={18} /> Add event
                </button>
              }
            />
          )}
        </div>
      ) : (
        <div className="week-grid list-gap">
          {WEEKDAY_ORDER.map((d) => (
            <section key={d} className={`week-day card ${d === today ? 'is-today' : ''}`} aria-label={WEEKDAY_LONG[d]}>
              <div className="week-day-head">
                <h2 className="week-day-name">{WEEKDAY_SHORT[d]}</h2>
                <button type="button" className="icon-btn icon-btn-sm" aria-label={`Add event on ${WEEKDAY_LONG[d]}`} onClick={() => setEditing({ days: [d] })}>
                  <Icon name="plus" size={16} />
                </button>
              </div>
              {byDay[d].length ? (
                byDay[d].map((e) => (
                  <button key={e.id} type="button" className={`week-event cat-${e.category.toLowerCase()}`} onClick={() => setEditing(e)}>
                    <span className="week-event-time">{e.start}</span>
                    <span className="week-event-title">{e.title}</span>
                  </button>
                ))
              ) : (
                <p className="muted small week-empty">Free</p>
              )}
            </section>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit event' : 'New event'}>
        {editing && (
          <EventForm
            initial={editing}
            onSubmit={submit}
            onCancel={() => setEditing(null)}
            onDelete={editing.id ? () => remove(editing) : undefined}
          />
        )}
      </Modal>
    </>
  );
}
