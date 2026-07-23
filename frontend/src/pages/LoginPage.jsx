import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../core/auth/AuthContext';

export default function LoginPage() {
  const { signInWithPassword, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const action = mode === 'login' ? signInWithPassword : signUp;
    const { error } = await action(email, password);

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    navigate('/');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-void)',
      }}
    >
      <div className="card" style={{ width: 360 }}>
        <h1 style={{ marginBottom: 4 }}>Home OS</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
          {mode === 'login' ? 'Prijavi se svom domaćinstvu' : 'Napravi novi nalog'}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="tvoj@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="label">Lozinka</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-error" style={{ marginBottom: 14 }}>{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Molim sačekaj...' : mode === 'login' ? 'Prijava' : 'Registracija'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="btn btn-ghost"
          style={{ marginTop: 14, width: '100%' }}
        >
          {mode === 'login' ? 'Nemaš nalog? Registruj se' : 'Već imaš nalog? Prijavi se'}
        </button>
      </div>
    </div>
  );
}
