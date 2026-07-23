import { useState } from 'react';
import { householdsApi } from '../api';
import { useHousehold } from '../../../core/household/HouseholdContext';

export function CreateHouseholdForm() {
  const { refresh } = useHousehold();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await householdsApi.create(name.trim());
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <h3 style={{ marginBottom: 4 }}>Napravi svoje domaćinstvo</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
        Daj mu ime da počneš — kasnije možeš pozvati ostale članove.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
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
  );
}
