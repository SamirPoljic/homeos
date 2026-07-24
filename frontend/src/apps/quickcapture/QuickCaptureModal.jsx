import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../tasks/api';
import { notesApi } from '../notes/api';
import { remindersApi } from '../reminders/api';
import { householdsApi } from '../households/api';

const TYPES = [
  { id: 'task', label: 'Task' },
  { id: 'note', label: 'Note' },
  { id: 'reminder', label: 'Podsjetnik' },
];

export function QuickCaptureModal({ householdId, onClose }) {
  const navigate = useNavigate();
  const [type, setType] = useState('task');
  const [templates, setTemplates] = useState([]);
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [templateId, setTemplateId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [reminderText, setReminderText] = useState('');

  useEffect(() => {
    tasksApi.listTemplates(householdId).then((res) => setTemplates(res.data));
    householdsApi.listMembers(householdId).then((res) => setMembers(res.data));
  }, [householdId]);

  function handleTemplateChange(id) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) setPriority(template.default_priority ?? 'medium');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (type === 'task') {
        const template = templates.find((t) => t.id === templateId);
        if (!template) throw new Error('Izaberi task iz registra');
        await tasksApi.create(householdId, {
          title: template.title,
          due_date: dueDate || null,
          priority,
          assigned_to: assignedTo || null,
          recurrence_rule: recurrence || null,
        });
        navigate('/tasks');
      } else if (type === 'note') {
        if (!noteTitle.trim()) throw new Error('Upiši naziv note');
        const res = await notesApi.create(householdId, noteTitle.trim());
        if (noteText.trim()) await notesApi.update(householdId, res.data.id, { content: noteText.trim() });
        navigate('/');
      } else if (type === 'reminder') {
        if (!recipientId || !reminderText.trim()) throw new Error('Izaberi primaoca i upiši poruku');
        await remindersApi.create(householdId, recipientId, reminderText.trim());
        navigate('/');
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        zIndex: 60,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: 420, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={type === t.id ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ flex: 1 }}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {type === 'task' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select className="input" value={templateId} onChange={(e) => handleTemplateChange(e.target.value)} required>
                <option value="" disabled>
                  Izaberi iz registra...
                </option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  type="date"
                  style={{ flex: 1 }}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <select className="input" style={{ width: 110 }} value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="low">Nizak</option>
                  <option value="medium">Srednji</option>
                  <option value="high">Visok</option>
                </select>
              </div>
              <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                <option value="">Nedodijeljeno</option>
                {members.map((m) => (
                  <option key={m.profiles.id} value={m.profiles.id}>
                    {m.profiles.full_name || m.profiles.email}
                  </option>
                ))}
              </select>
              <select className="input" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                <option value="">Ne ponavlja se</option>
                <option value="daily">Dnevno</option>
                <option value="weekly">Sedmično</option>
                <option value="monthly">Mjesečno</option>
              </select>
            </div>
          )}

          {type === 'note' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="input"
                placeholder="Naziv stranice"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                autoFocus
                required
              />
              <textarea
                className="input"
                style={{ minHeight: 100 }}
                placeholder="Sadržaj (opciono)..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
            </div>
          )}

          {type === 'reminder' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select className="input" value={recipientId} onChange={(e) => setRecipientId(e.target.value)} required>
                <option value="" disabled>
                  Kome je namijenjeno?
                </option>
                {members.map((m) => (
                  <option key={m.profiles.id} value={m.profiles.id}>
                    {m.profiles.full_name || m.profiles.email}
                  </option>
                ))}
              </select>
              <textarea
                className="input"
                style={{ minHeight: 80 }}
                placeholder="Napiši poruku..."
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                required
              />
            </div>
          )}

          {error && <p className="text-error" style={{ marginTop: 10 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" disabled={saving} type="submit" style={{ flex: 1 }}>
              {saving ? 'Dodavanje...' : 'Dodaj'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={onClose}>
              Otkaži
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
