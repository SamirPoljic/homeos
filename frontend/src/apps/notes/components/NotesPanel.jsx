import { useEffect, useState } from 'react';
import { notesApi } from '../api';

export function NotesPanel({ householdId }) {
  const [notes, setNotes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [saveStatus, setSaveStatus] = useState(''); // 'Sačuvano' privremeno nakon blur

  async function load(keepActive = true) {
    setLoading(true);
    setError(null);
    try {
      const res = await notesApi.list(householdId);
      setNotes(res.data);
      if (!keepActive || !res.data.find((n) => n.id === activeId)) {
        const first = res.data[0];
        setActiveId(first?.id ?? null);
        setContent(first?.content ?? '');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  function switchTab(note) {
    setActiveId(note.id);
    setContent(note.content ?? '');
  }

  async function handleAddTab() {
    try {
      const res = await notesApi.create(householdId, 'Nova stranica');
      await load();
      setActiveId(res.data.id);
      setContent('');
      // odmah uđi u "uredi naziv" mod da korisnik upiše ime bez dijaloga
      setRenamingId(res.data.id);
      setRenameValue('Nova stranica');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleContentBlur() {
    if (!activeId) return;
    try {
      await notesApi.update(householdId, activeId, { content });
      setSaveStatus('Sačuvano ✓');
      setTimeout(() => setSaveStatus(''), 1500);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRename(noteId) {
    if (!renameValue.trim()) return;
    try {
      await notesApi.update(householdId, noteId, { title: renameValue.trim() });
      setRenamingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(noteId) {
    if (!confirm('Obrisati ovu stranicu?')) return;
    try {
      await notesApi.remove(householdId, noteId);
      if (activeId === noteId) setActiveId(null);
      await load(false);
    } catch (err) {
      setError(err.message);
    }
  }

  const activeNote = notes.find((n) => n.id === activeId);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: '1px solid var(--border)',
          padding: '10px 10px 0',
          overflowX: 'auto',
        }}
      >
        {notes.map((note) => (
          <div
            key={note.id}
            onDoubleClick={() => {
              setRenamingId(note.id);
              setRenameValue(note.title);
            }}
            onClick={() => switchTab(note)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              background: note.id === activeId ? 'var(--bg-surface-raised)' : 'transparent',
              color: note.id === activeId ? 'var(--accent-hover)' : 'var(--text-secondary)',
              borderBottom: note.id === activeId ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {renamingId === note.id ? (
              <input
                autoFocus
                className="input"
                style={{ width: 100, padding: '2px 6px', fontSize: 12 }}
                value={renameValue}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRename(note.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(note.id)}
              />
            ) : (
              <>
                📝 {note.title}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(note.id);
                  }}
                  style={{ color: 'var(--text-muted)', fontSize: 11 }}
                >
                  ✕
                </span>
              </>
            )}
          </div>
        ))}
        <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={handleAddTab}>
          + Nova
        </button>
      </div>

      <div style={{ padding: 16 }}>
        {error && <p className="text-error" style={{ marginBottom: 10 }}>{error}</p>}

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Učitavanje...</p>
        ) : !activeNote ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Nema stranica još. Klikni "+ Nova" da napraviš prvu.
          </p>
        ) : (
          <>
            <textarea
              className="input"
              style={{ minHeight: 180, resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
              placeholder="Piši ovdje..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleContentBlur}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, height: 14 }}>{saveStatus}</div>
          </>
        )}
      </div>
    </div>
  );
}
