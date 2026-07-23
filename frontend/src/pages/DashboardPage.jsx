import { useEffect, useState } from 'react';
import { useHousehold } from '../core/household/HouseholdContext';
import { CreateHouseholdForm } from '../apps/households/components/CreateHouseholdForm';
import { api } from '../core/api/apiClient';

export default function DashboardPage() {
  const { household, loading } = useHousehold();
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

  if (!household) {
    return <CreateHouseholdForm />;
  }

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>Danas — {household.name}</h1>

      <div className="card" style={{ maxWidth: 480 }}>
        <h3 style={{ marginBottom: 12 }}>Faza 0/1 — status provjere</h3>
        <p>Frontend (Vercel): ✅ radi</p>
        <p>Backend (Render): {backendStatus}</p>
        <p>Baza (Supabase): {dbStatus}</p>
        <p style={{ marginTop: 8 }}>
          Tvoja rola: <span className={`badge badge-${household.role}`}>{household.role}</span>
        </p>
      </div>
    </div>
  );
}
