import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHousehold } from '../../../core/household/HouseholdContext';
import { tasksApi } from '../api';
import { householdsApi } from '../../households/api';


const PRIORITY_LABELS = { low: 'Nizak', medium: 'Srednji', high: 'Visok' };

export default function TasksListPage() {
  const { household } = useHousehold();
  const [tasks, setTasks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [filterText, setFilterText] = useState('');

  const [templateId, setTemplateId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [creating, setCreating] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [newSubtask, setNewSubtask] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');

  async function loadTasks() {
    if (!household) return;
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

  async function loadTemplates() {
    if (!household) return;
    try {
      const res = await tasksApi.listTemplates(household.id);
      setTemplates(res.data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadMembers() {
    if (!household) return;
    try {
      const res = await householdsApi.listMembers(household.id);
      setMembers(res.data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!household) return;
    loadTasks();
    loadTemplates();
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, showCompleted]);

  function memberName(profileId) {
    const m = members.find((mm) => mm.profiles?.id === profileId);
    return m?.profiles?.full_name || m?.profiles?.email || '—';
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!templateId) return;
    const template = templates.find((t) => t.id === templateId);
    setCreating(true);
    setError(null);
    try {
      await tasksApi.create(household.id, {
        title: template.title,
        due_date: dueDate || null,
        priority,
        assigned_to: assignedTo || null,
        recurrence_rule: recurrence || null,
      });
      setTemplateId('');
      setDueDate('');
      setPriority('medium');
      setAssignedTo('');
      setRecurrence('');
      await loadTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function handleTemplateChange(id) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) setPriority(template.default_priority ?? 'medium');
  }

  async function toggleComplete(task) {
    try {
      await tasksApi.setComplete(household.id, task.id, !task.completed);
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(taskId) {
    if (!confirm('Obrisati ovaj task?')) return;
    try {
      await tasksApi.remove(household.id, taskId);
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(task) {
    setEditingId(task.id);
    setEditFields({
      due_date: task.due_date ? task.due_date.slice(0, 10) : '',
      priority: task.priority,
      assigned_to: task.assigned_to ?? '',
    });
  }

  async function saveEdit(taskId) {
    try {
      await tasksApi.update(household.id, taskId, {
        due_date: editFields.due_date || null,
        priority: editFields.priority,
        assigned_to: editFields.assigned_to || null,
      });
      setEditingId(null);
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddSubtask(taskId) {
    if (!newSubtask.trim()) return;
    try {
      await tasksApi.addSubtask(household.id, taskId, newSubtask.trim());
      setNewSubtask('');
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleSubtask(subtask) {
    try {
      await tasksApi.updateSubtask(household.id, subtask.id, { completed: !subtask.completed });
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function renameSubtask(subtaskId) {
    if (!editSubtaskTitle.trim()) return;
    try {
      await tasksApi.updateSubtask(household.id, subtaskId, { title: editSubtaskTitle.trim() });
      setEditingSubtaskId(null);
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteSubtask(subtaskId) {
    try {
      await tasksApi.removeSubtask(household.id, subtaskId);
      await loadTasks();
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

      {templates.length === 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Registar taskova je prazan.{' '}
            <Link to="/settings" style={{ color: 'var(--accent-hover)' }}>
              Idi na Postavke → Registar taskova
            </Link>{' '}
            da dodaš prve unose.
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Dodaj task na listu</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            className="input"
            style={{ flex: 2, minWidth: 180 }}
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            required
          >
            <option value="" disabled>
              Izaberi iz registra...
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            style={{ flex: 1, minWidth: 140 }}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <select className="input" style={{ width: 120 }} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Nizak</option>
            <option value="medium">Srednji</option>
            <option value="high">Visok</option>
          </select>
          <select className="input" style={{ width: 160 }} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Nedodijeljeno</option>
            {members.map((m) => (
              <option key={m.profiles.id} value={m.profiles.id}>
                {m.profiles.full_name || m.profiles.email}
              </option>
            ))}
          </select>
          <select className="input" style={{ width: 130 }} value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
            <option value="">Ne ponavlja se</option>
            <option value="daily">Dnevno</option>
            <option value="weekly">Sedmično</option>
            <option value="monthly">Mjesečno</option>
          </select>
          <button className="btn btn-primary" disabled={creating || templates.length === 0} type="submit">
            {creating ? 'Dodavanje...' : 'Dodaj'}
          </button>
        </form>
      </div>

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      <input
        className="input"
        placeholder="🔍 Pretraži taskove..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        style={{ marginBottom: 14 }}
      />

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks
            .filter((t) => t.title.toLowerCase().includes(filterText.toLowerCase()))
            .map((task) => (
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
                    style={{ fontWeight: 600, textDecoration: task.completed ? 'line-through' : 'none', cursor: 'pointer' }}
                    onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                  >
                    {task.title}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {task.due_date && <span>📅 {task.due_date.slice(0, 10)}</span>}
                    {task.recurrence_rule && <span title="Ponavlja se">🔁</span>}
                    <span className={`badge badge-${task.priority === 'high' ? 'owner' : task.priority === 'low' ? 'member' : 'admin'}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    <span>👤 {task.assigned_to ? memberName(task.assigned_to) : 'Nedodijeljeno'}</span>
                    {task.subtasks?.length > 0 && (
                      <span>
                        {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtaskova
                      </span>
                    )}
                  </div>

                  {expandedId === task.id && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      {editingId === task.id ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                          <input
                            className="input"
                            type="date"
                            style={{ width: 150 }}
                            value={editFields.due_date}
                            onChange={(e) => setEditFields((f) => ({ ...f, due_date: e.target.value }))}
                          />
                          <select
                            className="input"
                            style={{ width: 120 }}
                            value={editFields.priority}
                            onChange={(e) => setEditFields((f) => ({ ...f, priority: e.target.value }))}
                          >
                            <option value="low">Nizak</option>
                            <option value="medium">Srednji</option>
                            <option value="high">Visok</option>
                          </select>
                          <select
                            className="input"
                            style={{ width: 160 }}
                            value={editFields.assigned_to}
                            onChange={(e) => setEditFields((f) => ({ ...f, assigned_to: e.target.value }))}
                          >
                            <option value="">Nedodijeljeno</option>
                            {members.map((m) => (
                              <option key={m.profiles.id} value={m.profiles.id}>
                                {m.profiles.full_name || m.profiles.email}
                              </option>
                            ))}
                          </select>
                          <button className="btn btn-primary" onClick={() => saveEdit(task.id)}>
                            Sačuvaj
                          </button>
                          <button className="btn btn-ghost" onClick={() => setEditingId(null)}>
                            Otkaži
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-secondary" style={{ marginBottom: 12 }} onClick={() => startEdit(task)}>
                          Uredi task
                        </button>
                      )}

                      {task.subtasks?.map((s) => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
                          <input type="checkbox" checked={s.completed} onChange={() => toggleSubtask(s)} />
                          {editingSubtaskId === s.id ? (
                            <>
                              <input
                                className="input"
                                style={{ padding: '4px 8px', fontSize: 12, flex: 1 }}
                                value={editSubtaskTitle}
                                onChange={(e) => setEditSubtaskTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && renameSubtask(s.id)}
                                autoFocus
                              />
                              <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => renameSubtask(s.id)}>
                                ✓
                              </button>
                              <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => setEditingSubtaskId(null)}>
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <span style={{ flex: 1, textDecoration: s.completed ? 'line-through' : 'none' }}>{s.title}</span>
                              <button
                                className="btn btn-ghost"
                                style={{ padding: '2px 6px' }}
                                onClick={() => {
                                  setEditingSubtaskId(s.id);
                                  setEditSubtaskTitle(s.title);
                                }}
                              >
                                ✎
                              </button>
                              <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => deleteSubtask(s.id)}>
                                ✕
                              </button>
                            </>
                          )}
                        </div>
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
