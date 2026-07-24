import { useEffect, useState } from 'react';
import { useHousehold } from '../../../core/household/HouseholdContext';
import { useAuth } from '../../../core/auth/AuthContext';
import { tasksApi } from '../../tasks/api';

const STATUS_COLUMNS = [
  { id: 'todo', label: 'To do' },
  { id: 'doing', label: 'Doing' },
  { id: 'done', label: 'Done (danas)' },
];

const PRIORITY_LABELS = { low: 'Nizak', medium: 'Srednji', high: 'Visok' };

function isToday(dateString) {
  if (!dateString) return false;
  const d = new Date(dateString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function KanbanBoardPage() {
  const { household } = useHousehold();
  const { user } = useAuth();
  const [openTasks, setOpenTasks] = useState([]);
  const [doneToday, setDoneToday] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  async function load() {
    if (!household || !user) return;
    setLoading(true);
    setError(null);
    try {
      const [openRes, doneRes] = await Promise.all([
        tasksApi.list(household.id, { completed: 'false', assigned_to: user.id }),
        tasksApi.list(household.id, { completed: 'true', assigned_to: user.id }),
      ]);
      setOpenTasks(openRes.data);
      setDoneToday(doneRes.data.filter((t) => isToday(t.completed_at)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (household && user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, user?.id]);

  async function handleDropOnStatus(status) {
    if (!draggedTaskId) return;
    try {
      await tasksApi.updateStatus(household.id, draggedTaskId, status);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDraggedTaskId(null);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  if (error && error.toLowerCase().includes('nemaš pristup')) {
    return (
      <div className="card" style={{ maxWidth: 420 }}>
        <h3 style={{ marginBottom: 8 }}>Nemaš pristup ovom modulu</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Owner ili admin domaćinstva ti mogu dodijeliti pristup u Postavke → Pristup modulima.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>Kanban</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
        Prikazani su samo taskovi dodijeljeni tebi. Prevuci karticu da promijeniš status.
      </p>

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
        {STATUS_COLUMNS.map((col) => {
          const colTasks =
            col.id === 'done' ? doneToday : openTasks.filter((t) => (t.status || 'todo') === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropOnStatus(col.id)}
              style={{
                minWidth: 260,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 14,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{col.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 40 }}>
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDraggedTaskId(task.id)}
                    className="card"
                    style={{ padding: '10px 12px', cursor: 'grab', boxShadow: 'var(--shadow-sm)' }}
                  >
                    <div style={{ fontSize: 13 }}>{task.title}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      {task.due_date && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          📅 {task.due_date.slice(0, 10)}
                        </span>
                      )}
                      <span className={`badge badge-${task.priority === 'high' ? 'owner' : task.priority === 'low' ? 'member' : 'admin'}`}>
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Prazno.</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
