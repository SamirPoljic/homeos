import { useEffect, useState } from 'react';
import { useHousehold } from '../../../core/household/HouseholdContext';
import { lifeAdminApi } from '../api';
import { supabase } from '../../../core/api/supabaseClient';

const TABS = [
  { id: 'documents', label: 'Dokumenti' },
  { id: 'contacts', label: 'Kontakti' },
  { id: 'shopping', label: 'Shopping liste' },
];

export default function LifeAdminPage() {
  const [activeTab, setActiveTab] = useState('documents');

  return (
    <div style={{ maxWidth: 780 }}>
      <h1 style={{ marginBottom: 4 }}>Life Admin</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
        Dokumenti, važni kontakti, i zajedničke liste za kupovinu.
      </p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
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

      {activeTab === 'documents' && <DocumentsTab />}
      {activeTab === 'contacts' && <ContactsTab />}
      {activeTab === 'shopping' && <ShoppingTab />}
    </div>
  );
}

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
}

function DocumentsTab() {
  const { household } = useHousehold();
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', expiry_date: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    if (!household) return;
    setLoading(true);
    try {
      const [docsRes, catsRes] = await Promise.all([
        lifeAdminApi.listDocuments(household.id),
        lifeAdminApi.listDocumentCategories(household.id),
      ]);
      setDocuments(docsRes.data);
      setCategories(catsRes.data);
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
    if (!form.name.trim()) return;
    setUploading(true);
    setError(null);
    try {
      let file_url = '';

      if (file) {
        const path = `${household.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
        file_url = urlData.publicUrl;
      }

      await lifeAdminApi.createDocument(household.id, { ...form, file_url });
      setForm({ name: '', category: '', expiry_date: '' });
      setFile(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Obrisati ovaj dokument?')) return;
    try {
      await lifeAdminApi.removeDocument(household.id, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!household || loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Novi dokument</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <input
            className="input"
            placeholder="Naziv (npr. Garancija - frižider)"
            style={{ flex: 1, minWidth: 160 }}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <select
            className="input"
            style={{ width: 160 }}
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">Bez kategorije</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            style={{ width: 150 }}
            value={form.expiry_date}
            onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
          />
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ fontSize: 12, color: 'var(--text-secondary)' }}
          />
          <button className="btn btn-primary" disabled={uploading} type="submit">
            {uploading ? 'Dodavanje...' : 'Dodaj'}
          </button>
        </form>
        {categories.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Nema kategorija još — dodaj ih u Postavke → Kategorije (Dokumenti).
          </p>
        )}
      </div>

      {error && <p className="text-error">{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {documents.map((d) => (
          <div key={d.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {d.category && `${d.category} · `}
                {d.expiry_date && (
                  <span style={{ color: isExpiringSoon(d.expiry_date) ? 'var(--danger)' : 'var(--text-muted)' }}>
                    ističe {d.expiry_date}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {d.file_url && (
                <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: 12 }}>
                  Otvori fajl
                </a>
              )}
              <button className="btn btn-ghost" onClick={() => handleDelete(d.id)}>
                Obriši
              </button>
            </div>
          </div>
        ))}
        {documents.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nema dokumenata još.</p>}
      </div>
    </div>
  );
}

function ContactsTab() {
  const { household } = useHousehold();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });

  async function load() {
    if (!household) return;
    setLoading(true);
    try {
      const res = await lifeAdminApi.listContacts(household.id);
      setContacts(res.data);
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
    if (!form.name.trim()) return;
    try {
      await lifeAdminApi.createContact(household.id, form);
      setForm({ name: '', phone: '', email: '', notes: '' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Obrisati ovaj kontakt?')) return;
    try {
      await lifeAdminApi.removeContact(household.id, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!household || loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Novi kontakt</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Ime"
            style={{ flex: 1, minWidth: 140 }}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            className="input"
            placeholder="Telefon"
            style={{ width: 140 }}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Email"
            style={{ width: 180 }}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <button className="btn btn-primary" type="submit">
            Dodaj
          </button>
        </form>
      </div>

      {error && <p className="text-error">{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {contacts.map((c) => (
          <div key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {[c.phone, c.email].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => handleDelete(c.id)}>
              Obriši
            </button>
          </div>
        ))}
        {contacts.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nema kontakata još.</p>}
      </div>
    </div>
  );
}

function ShoppingTab() {
  const { household } = useHousehold();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newListName, setNewListName] = useState('');
  const [newItemName, setNewItemName] = useState({});

  async function load() {
    if (!household) return;
    setLoading(true);
    try {
      const res = await lifeAdminApi.listShoppingLists(household.id);
      setLists(res.data);
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

  async function handleAddList(e) {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      await lifeAdminApi.createShoppingList(household.id, newListName.trim());
      setNewListName('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteList(id) {
    if (!confirm('Obrisati ovu listu?')) return;
    try {
      await lifeAdminApi.removeShoppingList(household.id, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddItem(listId) {
    const name = (newItemName[listId] ?? '').trim();
    if (!name) return;
    try {
      await lifeAdminApi.addShoppingItem(household.id, listId, name);
      setNewItemName((prev) => ({ ...prev, [listId]: '' }));
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleItem(item) {
    try {
      await lifeAdminApi.updateShoppingItem(household.id, item.id, { checked: !item.checked });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteItem(itemId) {
    try {
      await lifeAdminApi.removeShoppingItem(household.id, itemId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!household || loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div>
      <form onSubmit={handleAddList} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          className="input"
          placeholder="Naziv nove liste (npr. Pijaca)"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          Nova lista
        </button>
      </form>

      {error && <p className="text-error">{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {lists.map((list) => (
          <div key={list.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4>{list.name}</h4>
              <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => handleDeleteList(list.id)}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {list.shopping_items.map((item) => (
                <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={item.checked} onChange={() => handleToggleItem(item)} />
                  <span style={{ flex: 1, textDecoration: item.checked ? 'line-through' : 'none' }}>{item.name}</span>
                  <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => handleDeleteItem(item.id)}>
                    ✕
                  </button>
                </label>
              ))}
              {list.shopping_items.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Prazna lista.</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="input"
                style={{ fontSize: 12, padding: '6px 10px' }}
                placeholder="Novi artikal..."
                value={newItemName[list.id] ?? ''}
                onChange={(e) => setNewItemName((prev) => ({ ...prev, [list.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem(list.id)}
              />
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => handleAddItem(list.id)}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      {lists.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nema listi još.</p>}
    </div>
  );
}
