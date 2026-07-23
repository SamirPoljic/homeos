import { useEffect, useState } from 'react';
import { useHousehold } from '../../../core/household/HouseholdContext';
import { tasksApi } from '../api';

const PRIORITY_LABELS = { low: 'Nizak', medium: 'Srednji', high: 'Visok' };

export default function TasksListPage() {
  const { household } = useHousehold();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [creating, setCreating] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [newSubtask, setNewSubtask] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await tasksApi.list(household.id, showCompleted ? {} : { completed: 'false' });
      setTasks(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, showCompleted]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await tasksApi.create(household.id, {
        title: title.trim(),
        due_date: dueDate || null,
        priority,
      });
      setTitle('');
      setDueDate('');
      setPriority('medium');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleComplete(task) {
    try {
      await tasksApi.setComplete(household.id, task.id, !task.completed);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(taskId) {
    if (!confirm('Obrisati ovaj task?')) return;
    try {
      await tasksApi.remove(household.id, taskId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddSubtask(taskId) {
    if (!newSubtask.trim()) return;
    try {
      await tasksApi.addSubtask(household.id, taskId, newSubtask.trim());
      setNewSubtask('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleSubtask(subtask) {
    try {
      await tasksApi.updateSubtask(household.id, subtask.id, { completed: !subtask.completed });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>Taskovi</h1>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
          Prikaži završene
        </label>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Novi task</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ flex: 2, minWidth: 180 }}
            placeholder="Šta treba uraditi?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className="input"
            type="date"
            style={{ flex: 1, minWidth: 140 }}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <select className="input" style={{ width: 130 }} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Nizak</option>
            <option value="medium">Srednji</option>
            <option value="high">Visok</option>
          </select>
          <button className="btn btn-primary" disabled={creating} type="submit">
            {creating ? 'Dodavanje...' : 'Dodaj'}
          </button>
        </form>
      </div>

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.map((task) => (
            <div key={task.id} className="card" style={{ opacity: task.completed ? 0.55 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleComplete(task)}
                  style={{ marginTop: 4 }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      textDecoration: task.completed ? 'line-through' : 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                  >
                    {task.title}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {task.due_date && <span>📅 {task.due_date.slice(0, 10)}</span>}
                    <span className={`badge badge-${task.priority === 'high' ? 'owner' : task.priority === 'low' ? 'member' : 'admin'}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    {task.subtasks?.length > 0 && (
                      <span>
                        {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtaskova
                      </span>
                    )}
                  </div>

                  {expandedId === task.id && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      {task.subtasks?.map((s) => (
                        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
                          <input type="checkbox" checked={s.completed} onChange={() => toggleSubtask(s)} />
                          <span style={{ textDecoration: s.completed ? 'line-through' : 'none' }}>{s.title}</span>
                        </label>
                      ))}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input
                          className="input"
                          placeholder="Novi subtask..."
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask(task.id)}
                        />
                        <button className="btn btn-secondary" onClick={() => handleAddSubtask(task.id)}>
                          Dodaj
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button className="btn btn-ghost" onClick={() => handleDelete(task.id)}>
                  Obriši
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nema taskova još.</p>}
        </div>
      )}
    </div>
  );
}
