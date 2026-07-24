import { useEffect, useState } from 'react';
import { householdsApi } from '../api';
import { tasksApi } from '../../tasks/api';
import { TaskRegistryPanel } from '../../tasks/components/TaskRegistryPanel';
import { profileApi } from '../../profile/api';
import { financeApi } from '../../finance/api';
import { lifeAdminApi } from '../../life-admin/api';
import { appsManagerApi } from '../../apps-manager/api';
import { useApps } from '../../../core/apps/AppsContext';
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
  { id: 'finance-categories', label: 'Kategorije (Finansije)' },
  { id: 'document-categories', label: 'Kategorije (Dokumenti)' },
  { id: 'notifications', label: 'Notifikacije' },
  { id: 'apps', label: 'Apps' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('household');

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
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
      {activeTab === 'finance-categories' && <FinanceCategoriesTab />}
      {activeTab === 'document-categories' && <DocumentCategoriesTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'apps' && <AppsTab />}
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

const CATEGORY_LABELS = {
  task_assigned: 'Kad mi se dodijeli task',
  reminder: 'Kad mi neko pošalje poruku',
};

function NotificationsTab() {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await profileApi.getEmailPreferences();
      setPreferences(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(category, current) {
    try {
      await profileApi.updateEmailPreference(category, !current);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h3 style={{ marginBottom: 4 }}>Email notifikacije</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
        Odaberi za šta želiš da dobiješ email, pored in-app notifikacije (zvono gore desno).
      </p>

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {preferences.map((p) => (
          <label
            key={p.category}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: 'var(--bg-surface-raised)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 14 }}>{CATEGORY_LABELS[p.category] ?? p.category}</span>
            <input type="checkbox" checked={p.enabled} onChange={() => toggle(p.category, p.enabled)} />
          </label>
        ))}
      </div>
    </div>
  );
}

function FinanceCategoriesTab() {
  const { household } = useHousehold();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.listCategories(household.id);
      setCategories(res.data);
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

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await financeApi.createCategory(household.id, name.trim());
      setName('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Ukloniti ovu kategoriju?')) return;
    try {
      await financeApi.removeCategory(household.id, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!household || loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h3 style={{ marginBottom: 4 }}>Kategorije finansija</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 14 }}>
        Definiši kategorije ovdje — na Finansije stranici se samo biraju iz dropdown-a.
      </p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input className="input" placeholder="npr. Namirnice" value={name} onChange={(e) => setName(e.target.value)} required />
        <button className="btn btn-primary" disabled={adding} type="submit">
          {adding ? 'Dodavanje...' : 'Dodaj'}
        </button>
      </form>

      {error && <p className="text-error" style={{ marginBottom: 10 }}>{error}</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {categories.map((c) => (
          <span
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-surface-raised)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              fontSize: 13,
            }}
          >
            {c.name}
            <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => handleDelete(c.id)}>
              ✕
            </button>
          </span>
        ))}
        {categories.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nema kategorija još.</p>}
      </div>
    </div>
  );
}

function DocumentCategoriesTab() {
  const { household } = useHousehold();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const res = await lifeAdminApi.listDocumentCategories(household.id);
      setCategories(res.data);
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

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await lifeAdminApi.createDocumentCategory(household.id, name.trim());
      setName('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Ukloniti ovu kategoriju?')) return;
    try {
      await lifeAdminApi.removeDocumentCategory(household.id, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!household || loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h3 style={{ marginBottom: 4 }}>Kategorije dokumenata</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 14 }}>
        Definiši kategorije ovdje — na Life Admin stranici se samo biraju iz dropdown-a.
      </p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input className="input" placeholder="npr. Garancija" value={name} onChange={(e) => setName(e.target.value)} required />
        <button className="btn btn-primary" disabled={adding} type="submit">
          {adding ? 'Dodavanje...' : 'Dodaj'}
        </button>
      </form>

      {error && <p className="text-error" style={{ marginBottom: 10 }}>{error}</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {categories.map((c) => (
          <span
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-surface-raised)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              fontSize: 13,
            }}
          >
            {c.name}
            <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => handleDelete(c.id)}>
              ✕
            </button>
          </span>
        ))}
        {categories.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nema kategorija još.</p>}
      </div>
    </div>
  );
}

function AppsTab() {
  const { household } = useHousehold();
  const { apps, loading, refresh } = useApps();
  const [error, setError] = useState(null);
  const canManage = ['owner', 'admin'].includes(household?.role);

  async function handleToggle(appKey, current) {
    setError(null);
    try {
      await appsManagerApi.toggle(household.id, appKey, !current);
      await refresh(); // osvježava i ovaj tab i sidebar odjednom (dijele isti context)
    } catch (err) {
      setError(err.message);
    }
  }

  if (!household || loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h3 style={{ marginBottom: 4 }}>Apps</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
        Uključi ili isključi module za ovo domaćinstvo. Osnovni sistem (taskovi, notifikacije) se ne može isključiti.
      </p>

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {apps.map((app) => (
          <div
            key={app.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              background: 'var(--bg-surface-raised)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {app.name}
                {app.is_core && <span className="badge badge-owner" style={{ marginLeft: 8 }}>core</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {app.key} · v{app.version}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: app.is_core ? 'default' : 'pointer' }}>
              <input
                type="checkbox"
                checked={app.enabled}
                disabled={app.is_core || !canManage}
                onChange={() => handleToggle(app.key, app.enabled)}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
