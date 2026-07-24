import { useEffect, useState } from 'react';
import { useHousehold } from '../core/household/HouseholdContext';
import { useAuth } from '../core/auth/AuthContext';
import { CreateHouseholdForm } from '../apps/households/components/CreateHouseholdForm';
import { householdsApi } from '../apps/households/api';
import { tasksApi } from '../apps/tasks/api';
import { MonthCalendar, toDateKey } from '../apps/dashboard/components/MonthCalendar';
import { ReminderPanel } from '../apps/reminders/components/ReminderPanel';
import { NotesPanel } from '../apps/notes/components/NotesPanel';

const PRIORITY_LABELS = { low: 'Nizak', medium: 'Srednji', high: 'Visok' };

export default function DashboardPage() {
  const { household, loading: householdLoading } = useHousehold();
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popupDate, setPopupDate] = useState(null); // dan otvoren u popupu, null = zatvoreno

  async function load() {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const [tasksRes, membersRes] = await Promise.all([
        tasksApi.list(household.id, { completed: 'false' }),
        householdsApi.listMembers(household.id),
      ]);
      setTasks(tasksRes.data);
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

  if (householdLoading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;
  if (!household) return <CreateHouseholdForm />;

  // grupiši SVE (svi korisnici) taskove po datumu - koristi se za tačke na kalendaru i popup
  const tasksByDate = {};
  for (const t of tasks) {
    if (!t.due_date) continue;
    const key = t.due_date.slice(0, 10);
    (tasksByDate[key] ??= []).push(t);
  }

  const todayKey = toDateKey(new Date());
  const myTasks = tasks
    .filter((t) => t.assigned_to === user?.id)
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));
  const myTasksDueToday = (tasksByDate[todayKey] ?? []).filter((t) => t.assigned_to === user?.id);

  function memberName(profileId) {
    const m = members.find((mm) => mm.profiles?.id === profileId);
    return m?.profiles?.full_name || m?.profiles?.email || '—';
  }

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>Početna tabla — {household.name}</h1>

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr 300px', gap: 20, alignItems: 'start' }}>
          <MonthCalendar tasksByDate={tasksByDate} selectedDate={popupDate} onSelectDate={setPopupDate} />

          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Moji taskovi</h3>
            {myTasks.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Nemaš dodijeljenih taskova.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {myTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{ padding: '10px 12px', background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                      {task.due_date && <span>📅 {task.due_date.slice(0, 10)}</span>}
                      <span className={`badge badge-${(task.status || 'todo') === 'doing' ? 'admin' : 'member'}`}>
                        {task.status === 'doing' ? 'Doing' : 'To do'}
                      </span>
                      <span className={`badge badge-${task.priority === 'high' ? 'owner' : task.priority === 'low' ? 'member' : 'admin'}`}>
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ReminderPanel
            householdId={household.id}
            members={members}
            currentUserId={user?.id}
            tasksDueToday={myTasksDueToday}
          />
        </div>
      )}

      {!loading && (
        <div style={{ marginTop: 20 }}>
          <NotesPanel householdId={household.id} />
        </div>
      )}

      {popupDate && (
        <div
          onClick={() => setPopupDate(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: 420, maxHeight: '70vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3>Taskovi — {popupDate}</h3>
              <button className="btn btn-ghost" onClick={() => setPopupDate(null)}>✕</button>
            </div>

            {(tasksByDate[popupDate] ?? []).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Nema taskova za ovaj dan.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasksByDate[popupDate].map((task) => (
                  <div
                    key={task.id}
                    style={{ padding: '10px 12px', background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span className={`badge badge-${(task.status || 'todo') === 'doing' ? 'admin' : 'member'}`}>
                        {task.status === 'doing' ? 'Doing' : 'To do'}
                      </span>
                      <span>👤 {task.assigned_to ? memberName(task.assigned_to) : 'Nedodijeljeno'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
