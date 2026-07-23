import { useState } from 'react';
import { tasksApi } from '../api';

export function TaskRegistryPanel({ householdId, templates, onChange }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await tasksApi.createTemplate(householdId, title.trim(), priority);
      setTitle('');
      setPriority('medium');
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(templateId) {
    if (!editTitle.trim()) return;
    try {
      await tasksApi.updateTemplate(householdId, templateId, { title: editTitle.trim() });
      setEditingId(null);
      await onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(templateId) {
    if (!confirm('Ukloniti ovaj task iz registra?')) return;
    try {
      await tasksApi.removeTemplate(householdId, templateId);
      await onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h3 style={{ marginBottom: 4 }}>Registar taskova</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 14 }}>
        Definiši koji taskovi postoje — kasnije ih samo biraš, ne upisuješ ponovo.
      </p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input
          className="input"
          placeholder="npr. Iznesi smeće"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <select className="input" style={{ width: 130 }} value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Nizak</option>
          <option value="medium">Srednji</option>
          <option value="high">Visok</option>
        </select>
        <button className="btn btn-primary" disabled={adding} type="submit">
          {adding ? 'Dodavanje...' : 'Dodaj u registar'}
        </button>
      </form>

      {error && <p className="text-error" style={{ marginBottom: 10 }}>{error}</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {templates.map((t) => (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-surface-raised)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              fontSize: 13,
            }}
          >
            {editingId === t.id ? (
              <>
                <input
                  className="input"
                  style={{ width: 140, padding: '4px 8px', fontSize: 12 }}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(t.id)}
                  autoFocus
                />
                <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => handleRename(t.id)}>
                  ✓
                </button>
                <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => setEditingId(null)}>
                  ✕
                </button>
              </>
            ) : (
              <>
                <span>{t.title}</span>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '2px 6px' }}
                  onClick={() => {
                    setEditingId(t.id);
                    setEditTitle(t.title);
                  }}
                >
                  ✎
                </button>
                <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => handleDelete(t.id)}>
                  ✕
                </button>
              </>
            )}
          </div>
        ))}
        {templates.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Registar je prazan — dodaj prvi task iznad.</p>
        )}
      </div>
    </div>
  );
}
