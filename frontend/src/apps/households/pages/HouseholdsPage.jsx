import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHousehold } from '../../../core/household/HouseholdContext';
import { householdsApi } from '../api';

export default function HouseholdsPage() {
  const { households, refresh, switchHousehold, currentHouseholdId } = useHousehold();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await householdsApi.create(name.trim());
      await refresh();
      switchHousehold(res.data.id);
      setName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ marginBottom: 20 }}>Domaćinstva</h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Novo domaćinstvo</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10 }}>
          <input
            className="input"
            placeholder="npr. Naš dom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? 'Kreiranje...' : 'Kreiraj'}
          </button>
        </form>
        {error && <p className="text-error" style={{ marginTop: 8 }}>{error}</p>}
      </div>

      <h3 style={{ marginBottom: 12 }}>Tvoja domaćinstva</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {households.map((h) => (
          <div
            key={h.id}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderColor: h.id === currentHouseholdId ? 'var(--accent)' : undefined,
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{h.name}</div>
              <span className={`badge badge-${h.role}`}>{h.role}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {h.id !== currentHouseholdId && (
                <button className="btn btn-secondary" onClick={() => switchHousehold(h.id)}>
                  Izaberi
                </button>
              )}
              <Link className="btn btn-primary" to={`/households/${h.id}/members`}>
                Članovi
              </Link>
            </div>
          </div>
        ))}
        {households.length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>Još nemaš nijedno domaćinstvo.</p>
        )}
      </div>
    </div>
  );
}
