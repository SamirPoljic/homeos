import { useEffect, useState } from 'react';
import { remindersApi } from '../api';

export function ReminderPanel({ householdId, members, currentUserId, tasksDueToday }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  function memberName(profileId) {
    const m = members.find((mm) => mm.profiles?.id === profileId);
    return m?.profiles?.full_name || m?.profiles?.email || '—';
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await remindersApi.list(householdId);
      setReminders(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  async function handleSend(e) {
    e.preventDefault();
    if (!recipientId || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      await remindersApi.create(householdId, recipientId, message.trim());
      setMessage('');
      setRecipientId('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleDismiss(reminderId) {
    try {
      await remindersApi.dismiss(householdId, reminderId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const otherMembers = members.filter((m) => m.profiles?.id !== currentUserId);

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>Podsjetnik</h3>

      {error && <p className="text-error" style={{ marginBottom: 10 }}>{error}</p>}

      {tasksDueToday.length > 0 && (
        <div style={{ marginBottom: 14, maxHeight: 140, overflowY: 'auto' }}>
          {tasksDueToday.map((task) => (
            <div
              key={task.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                background: 'var(--accent-dim)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              📌 <span>Task: <strong>{task.title}</strong></span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Učitavanje...</p>
      ) : reminders.length === 0 && tasksDueToday.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>Nema novih poruka ni podsjetnika.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, maxHeight: 140, overflowY: 'auto' }}>
          {reminders.map((r) => (
            <div
              key={r.id}
              style={{
                padding: '8px 10px',
                background: 'var(--bg-surface-raised)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>
                    od {memberName(r.created_by)}
                  </div>
                  <div>{r.title}</div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => handleDismiss(r.id)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <h4 style={{ fontSize: 13, marginBottom: 8, color: 'var(--text-secondary)' }}>Pošalji poruku</h4>
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <select className="input" value={recipientId} onChange={(e) => setRecipientId(e.target.value)} required>
            <option value="" disabled>
              Kome je namijenjena?
            </option>
            {otherMembers.map((m) => (
              <option key={m.profiles.id} value={m.profiles.id}>
                {m.profiles.full_name || m.profiles.email}
              </option>
            ))}
          </select>
          <textarea
            className="input"
            style={{ minHeight: 60, resize: 'vertical', fontFamily: 'var(--font-body)' }}
            placeholder="Napiši poruku..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <button className="btn btn-primary" disabled={sending} type="submit">
            {sending ? 'Slanje...' : 'Pošalji'}
          </button>
        </form>
        {otherMembers.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
            Nema drugih članova u domaćinstvu još.
          </p>
        )}
      </div>
    </div>
  );
}
