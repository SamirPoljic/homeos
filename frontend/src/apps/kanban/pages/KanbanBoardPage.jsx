import { useEffect, useState } from 'react';
import { useHousehold } from '../../../core/household/HouseholdContext';
import { tasksApi } from '../../tasks/api';
import { householdsApi } from '../../households/api';

const STATUS_COLUMNS = [
  { id: 'todo', label: 'To do' },
  { id: 'doing', label: 'Doing' },
  { id: 'done', label: 'Done (danas)' },
];

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
  const [groupBy, setGroupBy] = useState(() => localStorage.getItem('homeos.kanbanGroupBy') || 'status');
  const [openTasks, setOpenTasks] = useState([]); // todo + doing (not completed)
  const [doneToday, setDoneToday] = useState([]); // completed today
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  async function load() {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const [openRes, doneRes, membersRes] = await Promise.all([
        tasksApi.list(household.id, { completed: 'false' }),
        tasksApi.list(household.id, { completed: 'true' }),
        householdsApi.listMembers(household.id),
      ]);
      setOpenTasks(openRes.data);
      setDoneToday(doneRes.data.filter((t) => isToday(t.completed_at)));
      setMembers(membersRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (household) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  function handleGroupByChange(value) {
    setGroupBy(value);
    localStorage.setItem('homeos.kanbanGroupBy', value);
  }

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

  async function handleDropOnMember(profileId) {
    if (!draggedTaskId) return;
    try {
      await tasksApi.update(household.id, draggedTaskId, { assigned_to: profileId });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDraggedTaskId(null);
    }
  }

  function memberName(profileId) {
    const m = members.find((mm) => mm.profiles?.id === profileId);
    return m?.profiles?.full_name || m?.profiles?.email || '—';
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  const memberColumns = [
    { id: 'unassigned', label: 'Nedodijeljeno', profileId: null },
    ...members.map((m) => ({ id: m.profiles.id, label: m.profiles.full_name || m.profiles.email, profileId: m.profiles.id })),
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>Kanban</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Grupiši po:</span>
          <select className="input" style={{ width: 140 }} value={groupBy} onChange={(e) => handleGroupByChange(e.target.value)}>
            <option value="status">Status</option>
            <option value="member">Osoba</option>
          </select>
        </div>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
        Prevuci task da promijeniš {groupBy === 'status' ? 'status' : 'zaduženu osobu'}. Novi taskovi se dodaju na
        stranici Taskovi. Završeni taskovi ostaju u "Done" samo za današnji dan.
      </p>

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      {groupBy === 'status' ? (
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
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        👤 {task.assigned_to ? memberName(task.assigned_to) : 'Nedodijeljeno'}
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Prazno.</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
          {memberColumns.map((col) => {
            const colTasks = openTasks.filter((t) => (t.assigned_to ?? null) === col.profileId);
            return (
              <div
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnMember(col.profileId)}
                style={{
                  minWidth: 240,
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
                      <span style={{ fontSize: 13 }}>{task.title}</span>
                    </div>
                  ))}
                  {colTasks.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nema taskova.</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
