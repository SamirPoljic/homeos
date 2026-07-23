import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { householdsApi } from '../api';
import { useAuth } from '../../../core/auth/AuthContext';

export default function HouseholdMembersPage() {
  const { householdId } = useParams();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await householdsApi.listMembers(householdId);
      setMembers(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  const myMembership = members.find((m) => m.profiles?.id === user?.id);
  const canManage = myMembership && ['owner', 'admin'].includes(myMembership.role);

  async function handleInvite(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setError(null);
    try {
      await householdsApi.inviteMember(householdId, email.trim());
      setEmail('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId, role) {
    try {
      await householdsApi.changeRole(householdId, memberId, role);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(memberId) {
    if (!confirm('Ukloniti ovog člana iz domaćinstva?')) return;
    try {
      await householdsApi.removeMember(householdId, memberId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Link to="/households" className="btn btn-ghost" style={{ marginBottom: 12, paddingLeft: 0 }}>
        ← Nazad na domaćinstva
      </Link>
      <h1 style={{ marginBottom: 20 }}>Članovi domaćinstva</h1>

      {canManage && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Pozovi člana</h3>
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              type="email"
              placeholder="email@primjer.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="btn btn-primary" disabled={inviting} type="submit">
              {inviting ? 'Slanje...' : 'Pozovi'}
            </button>
          </form>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
            Osoba mora imati Home OS nalog (bar jednom se registrovala) da bi mogla biti dodana.
          </p>
        </div>
      )}

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map((m) => (
            <div
              key={m.id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{m.profiles?.full_name || m.profiles?.email}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{m.profiles?.email}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {canManage && m.profiles?.id !== user?.id ? (
                  <select
                    className="input"
                    style={{ width: 130 }}
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.id, e.target.value)}
                  >
                    <option value="owner">owner</option>
                    <option value="admin">admin</option>
                    <option value="member">member</option>
                  </select>
                ) : (
                  <span className={`badge badge-${m.role}`}>{m.role}</span>
                )}

                {canManage && m.profiles?.id !== user?.id && (
                  <button className="btn btn-ghost" onClick={() => handleRemove(m.id)}>
                    Ukloni
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
