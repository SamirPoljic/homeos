import { useEffect, useState } from 'react';
import { householdsApi } from '../api';
import { useHousehold } from '../../../core/household/HouseholdContext';
import { useAuth } from '../../../core/auth/AuthContext';

const SCOPE_LABELS = {
  tasks: 'Taskovi',
  kanban: 'Kanban',
  calendar: 'Kalendar',
  reminders: 'Podsjetnici',
  notes: 'Notes',
  finance: 'Finansije',
  life_admin: 'Life Admin',
};

export default function SettingsPage() {
  const { household, refresh } = useHousehold();
  const { user } = useAuth();

  const [name, setName] = useState(household?.name ?? '');
  const [savingName, setSavingName] = useState(false);

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const [scopes, setScopes] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [permsLoading, setPermsLoading] = useState(true);

  const [error, setError] = useState(null);

  const myMembership = members.find((m) => m.profiles?.id === user?.id);
  const canManage = myMembership && ['owner', 'admin'].includes(myMembership.role);

  async function loadMembers() {
    setMembersLoading(true);
    try {
      const res = await householdsApi.listMembers(household.id);
      setMembers(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setMembersLoading(false);
    }
  }

  async function loadPermissions() {
    setPermsLoading(true);
    try {
      const res = await householdsApi.getPermissions(household.id);
      setScopes(res.data.scopes);
      setOverrides(res.data.overrides);
    } catch (err) {
      setError(err.message);
    } finally {
      setPermsLoading(false);
    }
  }

  useEffect(() => {
    if (!household) return;
    setName(household.name);
    loadMembers();
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  async function handleSaveName(e) {
    e.preventDefault();
    if (!name.trim() || name === household.name) return;
    setSavingName(true);
    setError(null);
    try {
      await householdsApi.updateName(household.id, name.trim());
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingName(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setError(null);
    try {
      await householdsApi.inviteMember(household.id, email.trim());
      setEmail('');
      await loadMembers();
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId, role) {
    try {
      await householdsApi.changeRole(household.id, memberId, role);
      await loadMembers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(memberId) {
    if (!confirm('Ukloniti ovog člana iz domaćinstva?')) return;
    try {
      await householdsApi.removeMember(household.id, memberId);
      await loadMembers();
    } catch (err) {
      setError(err.message);
    }
  }

  function isGranted(profileId, scope) {
    const override = overrides.find((o) => o.profile_id === profileId && o.scope === scope);
    return override ? override.granted : true; // default: dozvoljeno
  }

  async function togglePermission(profileId, scope) {
    const current = isGranted(profileId, scope);
    try {
      await householdsApi.updatePermission(household.id, profileId, scope, !current);
      await loadPermissions();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!household) return null;

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ marginBottom: 4 }}>Postavke domaćinstva</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Ime, članovi i pristupi po modulu.
        </p>
      </div>

      {error && <p className="text-error">{error}</p>}

      {/* Naziv domaćinstva */}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Naziv domaćinstva</h3>
        <form onSubmit={handleSaveName} style={{ display: 'flex', gap: 10 }}>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canManage}
          />
          {canManage && (
            <button className="btn btn-primary" disabled={savingName} type="submit">
              {savingName ? 'Čuvanje...' : 'Sačuvaj'}
            </button>
          )}
        </form>
      </div>

      {/* Članovi */}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Članovi</h3>

        {canManage && (
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
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
        )}

        {membersLoading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'var(--bg-surface-raised)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {m.profiles?.full_name || m.profiles?.email}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.profiles?.email}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {canManage && m.profiles?.id !== user?.id ? (
                    <select
                      className="input"
                      style={{ width: 120 }}
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

      {/* Permisije po modulu */}
      <div className="card">
        <h3 style={{ marginBottom: 4 }}>Pristup modulima</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
          Odaberi koje module svaki član smije koristiti. Owner uvijek ima pristup svemu.
        </p>

        {permsLoading || membersLoading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-secondary)' }}>
                    Član
                  </th>
                  {scopes.map((scope) => (
                    <th
                      key={scope}
                      style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontWeight: 500 }}
                    >
                      {SCOPE_LABELS[scope] ?? scope}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isOwner = m.role === 'owner';
                  return (
                    <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px' }}>
                        {m.profiles?.full_name || m.profiles?.email}
                        {isOwner && <span className="badge badge-owner" style={{ marginLeft: 8 }}>owner</span>}
                      </td>
                      {scopes.map((scope) => (
                        <td key={scope} style={{ textAlign: 'center', padding: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isOwner ? true : isGranted(m.profiles.id, scope)}
                            disabled={isOwner || !canManage}
                            onChange={() => togglePermission(m.profiles.id, scope)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
