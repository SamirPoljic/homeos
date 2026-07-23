import { useEffect, useState } from 'react';
import { householdsApi } from '../api';
import { tasksApi } from '../../tasks/api';
import { TaskRegistryPanel } from '../../tasks/components/TaskRegistryPanel';
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

const TABS = [
  { id: 'household', label: 'Domaćinstvo' },
  { id: 'members', label: 'Članovi' },
  { id: 'permissions', label: 'Pristup modulima' },
  { id: 'registry', label: 'Registar taskova' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('household');

  return (
    <div style={{ maxWidth: 780 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ marginBottom: 4 }}>Postavke domaćinstva</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Ime, članovi, pristupi po modulu, i registar taskova.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === tab.id ? 'var(--accent-hover)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'household' && <HouseholdTab />}
      {activeTab === 'members' && <MembersTab />}
      {activeTab === 'permissions' && <PermissionsTab />}
      {activeTab === 'registry' && <RegistryTab />}
    </div>
  );
}

function HouseholdTab() {
  const { household, refresh } = useHousehold();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const canManage = ['owner', 'admin'].includes(household?.role);

  useEffect(() => {
    if (household) setName(household.name);
  }, [household?.name]);

  async function handleSave(e) {
    e.preventDefault();
    if (!household || !name.trim() || name === household.name) return;
    setSaving(true);
    setError(null);
    try {
      await householdsApi.updateName(household.id, name.trim());
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!household) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h3 style={{ marginBottom: 12 }}>Naziv domaćinstva</h3>
      <form onSubmit={handleSave} style={{ display: 'flex', gap: 10 }}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={!canManage} />
        {canManage && (
          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? 'Čuvanje...' : 'Sačuvaj'}
          </button>
        )}
      </form>
      {error && <p className="text-error" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}

function MembersTab() {
  const { household } = useHousehold();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState(null);

  const myMembership = members.find((m) => m.profiles?.id === user?.id);
  const canManage = myMembership && ['owner', 'admin'].includes(myMembership.role);

  async function load() {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const res = await householdsApi.listMembers(household.id);
      setMembers(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (household) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  async function handleInvite(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setError(null);
    try {
      await householdsApi.inviteMember(household.id, email.trim());
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
      await householdsApi.changeRole(household.id, memberId, role);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(memberId) {
    if (!confirm('Ukloniti ovog člana iz domaćinstva?')) return;
    try {
      await householdsApi.removeMember(household.id, memberId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!household) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
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

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      {loading ? (
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
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.profiles?.full_name || m.profiles?.email}</div>
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
  );
}

function PermissionsTab() {
  const { household } = useHousehold();
  const [members, setMembers] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const canManage = ['owner', 'admin'].includes(household?.role);

  async function load() {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const [membersRes, permsRes] = await Promise.all([
        householdsApi.listMembers(household.id),
        householdsApi.getPermissions(household.id),
      ]);
      setMembers(membersRes.data);
      setScopes(permsRes.data.scopes);
      setOverrides(permsRes.data.overrides);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (household) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  function isGranted(profileId, scope) {
    const override = overrides.find((o) => o.profile_id === profileId && o.scope === scope);
    return override ? override.granted : true;
  }

  async function togglePermission(profileId, scope) {
    const current = isGranted(profileId, scope);
    try {
      await householdsApi.updatePermission(household.id, profileId, scope, !current);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!household) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div className="card">
      <h3 style={{ marginBottom: 4 }}>Pristup modulima</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
        Odaberi koje module svaki član smije koristiti. Owner uvijek ima pristup svemu.
      </p>

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-secondary)' }}>Član</th>
                {scopes.map((scope) => (
                  <th key={scope} style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontWeight: 500 }}>
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
  );
}

function RegistryTab() {
  const { household } = useHousehold();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!household) return;
    setLoading(true);
    try {
      const res = await tasksApi.listTemplates(household.id);
      setTemplates(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (household) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  if (!household || loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return <TaskRegistryPanel householdId={household.id} templates={templates} onChange={load} />;
}
