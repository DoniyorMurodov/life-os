import { useCallback, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import Header from '../components/Header';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Segmented from '../components/Segmented';
import Icon from '../components/Icon';
import { TASK_CATEGORIES } from '../data/defaultData';
import { compareTasks, isTaskForToday } from '../utils/calculations';

const FILTERS = ['All', 'Today', 'Pending', 'Completed'];

const FILTER_FN = {
  All: () => true,
  Today: (t) => isTaskForToday(t),
  Pending: (t) => !t.completed,
  Completed: (t) => t.completed,
};

export default function Tasks() {
  const { tasks, taskActions, toggleTask } = useApp();
  const toast = useToast();
  const [filter, setFilter] = useState('All');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // null | {} (new) | task

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter(FILTER_FN[filter])
      .filter((t) => category === 'All' || t.category === category)
      .filter((t) => !q || t.title.toLowerCase().includes(q))
      .sort(compareTasks);
  }, [tasks, filter, category, query]);

  const pendingCount = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);

  const handleDelete = useCallback(
    (task) => {
      taskActions.remove(task.id);
      toast('Task deleted', { action: { label: 'Undo', onClick: () => taskActions.restore(task) } });
    },
    [taskActions, toast],
  );

  const handleSubmit = (data) => {
    if (editing?.id) {
      taskActions.update(editing.id, data);
      toast('Task updated');
    } else {
      taskActions.add({ ...data, completed: false, completedAt: null });
      toast('Task added');
    }
    setEditing(null);
  };

  return (
    <>
      <Header title="Tasks" subtitle={`${pendingCount} pending · ${tasks.length - pendingCount} completed`}>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
          <Icon name="plus" size={18} /> New task
        </button>
      </Header>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={18} />
          <input
            type="search"
            className="input"
            placeholder="Search tasks"
            aria-label="Search tasks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="input toolbar-select" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="All">All categories</option>
          {TASK_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <Segmented label="Filter tasks" options={FILTERS} value={filter} onChange={setFilter} />

      <div className="stack-sm list-gap">
        {visible.map((task) => (
          <TaskCard key={task.id} task={task} onToggle={toggleTask} onEdit={setEditing} onDelete={handleDelete} />
        ))}
      </div>

      {!visible.length && (
        <EmptyState
          icon="tasks"
          title={tasks.length ? 'No matching tasks' : 'No tasks yet'}
          description={tasks.length ? 'Try a different filter or search.' : 'Create your first task to start tracking your day.'}
          action={
            !tasks.length && (
              <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
                <Icon name="plus" size={18} /> Create your first task
              </button>
            )
          }
        />
      )}

      <button type="button" className="fab" aria-label="New task" onClick={() => setEditing({})}>
        <Icon name="plus" size={24} />
      </button>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit task' : 'New task'}>
        {editing && <TaskForm initial={editing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
