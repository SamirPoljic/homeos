import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHousehold } from '../core/household/HouseholdContext';
import { api } from '../core/api/apiClient';

export default function DashboardPage() {
  const { currentHousehold, loading } = useHousehold();
  const [backendStatus, setBackendStatus] = useState('provjera...');
  const [dbStatus, setDbStatus] = useState('provjera...');

  useEffect(() => {
    api
      .get('/health')
      .then(() => setBackendStatus('✅ Backend povezan'))
      .catch(() => setBackendStatus('❌ Backend nedostupan'));

    fetch(`${import.meta.env.VITE_API_URL}/health/db`)
      .then((r) => r.json())
      .then((json) => setDbStatus(json.status === 'ok' ? '✅ Baza povezana' : `❌ ${json.message}`))
      .catch(() => setDbStatus('❌ Baza nedostupna'));
  }, []);

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;
  }

  if (!currentHousehold) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h3 style={{ marginBottom: 8 }}>Nemaš još domaćinstvo</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
          Napravi svoje prvo domaćinstvo da počneš koristiti Home OS.
        </p>
        <Link to="/households" className="btn btn-primary">
          Napravi domaćinstvo
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>Danas — {currentHousehold.name}</h1>

      <div className="card" style={{ maxWidth: 480 }}>
        <h3 style={{ marginBottom: 12 }}>Faza 0/1 — status provjere</h3>
        <p>Frontend (Vercel): ✅ radi</p>
        <p>Backend (Render): {backendStatus}</p>
        <p>Baza (Supabase): {dbStatus}</p>
        <p style={{ marginTop: 8 }}>
          Tvoja rola: <span className={`badge badge-${currentHousehold.role}`}>{currentHousehold.role}</span>
        </p>
      </div>
    </div>
  );
}
