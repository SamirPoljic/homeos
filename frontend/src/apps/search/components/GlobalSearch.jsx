import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../api';

export function GlobalSearch({ householdId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await searchApi.search(householdId, query.trim());
        setResults(res.data);
        setOpen(true);
      } catch {
        // tiho - pretraga nije kritična
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, householdId]);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function goTo(path) {
    navigate(path);
    setOpen(false);
    setQuery('');
  }

  const hasResults =
    results && (results.tasks.length || results.notes.length || results.contacts.length || results.documents.length);

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 360 }} ref={ref}>
      <input
        className="input"
        placeholder="Pretraži sve (taskovi, notes, kontakti, dokumenti)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query && setOpen(true)}
      />

      {open && results && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--bg-surface-raised)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: 10,
            zIndex: 40,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {!hasResults ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nema rezultata.</p>
          ) : (
            <>
              {results.tasks.length > 0 && (
                <ResultGroup title="Taskovi">
                  {results.tasks.map((t) => (
                    <ResultItem key={t.id} label={t.title} onClick={() => goTo('/tasks')} />
                  ))}
                </ResultGroup>
              )}
              {results.notes.length > 0 && (
                <ResultGroup title="Notes">
                  {results.notes.map((n) => (
                    <ResultItem key={n.id} label={n.title} onClick={() => goTo('/')} />
                  ))}
                </ResultGroup>
              )}
              {results.contacts.length > 0 && (
                <ResultGroup title="Kontakti">
                  {results.contacts.map((c) => (
                    <ResultItem key={c.id} label={c.name} onClick={() => goTo('/life-admin')} />
                  ))}
                </ResultGroup>
              )}
              {results.documents.length > 0 && (
                <ResultGroup title="Dokumenti">
                  {results.documents.map((d) => (
                    <ResultItem key={d.id} label={d.name} onClick={() => goTo('/life-admin')} />
                  ))}
                </ResultGroup>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({ title, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ResultItem({ label, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ padding: '6px 8px', fontSize: 13, cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
    </div>
  );
}
