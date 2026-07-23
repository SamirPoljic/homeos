import { useEffect, useState } from 'react';
import { useAuth } from '../core/auth/AuthContext';
import { api } from '../core/api/apiClient';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
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

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Today — Home OS</h1>
      <p>Prijavljen kao: {user?.email}</p>

      <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8, marginTop: 16 }}>
        <h3>Faza 0 — status provjere</h3>
        <p>Frontend (Vercel): ✅ radi (vidiš ovu stranicu)</p>
        <p>Backend (Render): {backendStatus}</p>
        <p>Baza (Supabase): {dbStatus}</p>
      </div>

      <button onClick={signOut} style={{ marginTop: 16 }}>
        Odjava
      </button>
    </div>
  );
}
