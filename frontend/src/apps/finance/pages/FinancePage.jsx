import { useEffect, useState } from 'react';
import { useHousehold } from '../../../core/household/HouseholdContext';
import { financeApi } from '../api';
import { ConfirmDialog } from '../../../core/components/ConfirmDialog';

function formatMoney(n) {
  return Number(n).toFixed(2);
}

const TABS = [
  { id: 'transactions', label: 'Transakcije' },
  { id: 'budgets', label: 'Budžeti' },
  { id: 'bills', label: 'Računi' },
  { id: 'who-owes', label: 'Ko duguje' },
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('transactions');

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ marginBottom: 20 }}>Finansije</h1>

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

      {activeTab === 'transactions' && <TransactionsTab />}
      {activeTab === 'budgets' && <BudgetsTab />}
      {activeTab === 'bills' && <BillsTab />}
      {activeTab === 'who-owes' && <WhoOwesTab />}
    </div>
  );
}

function TransactionsTab() {
  const { household } = useHousehold();
  const [categories, setCategories] = useState([]);
  const [householdTx, setHouseholdTx] = useState([]);
  const [personalTx, setPersonalTx] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    description: '',
    category_id: '',
    occurred_at: new Date().toISOString().slice(0, 10),
    personal: false,
  });
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  async function load() {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const [catRes, hhRes, personalRes, summaryRes] = await Promise.all([
        financeApi.listCategories(household.id),
        financeApi.listTransactions(household.id, 'household'),
        financeApi.listTransactions(household.id, 'personal'),
        financeApi.getSummary(household.id),
      ]);
      setCategories(catRes.data);
      setHouseholdTx(hhRes.data);
      setPersonalTx(personalRes.data);
      setSummary(summaryRes.data);
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

  async function handleAddTransaction(e) {
    e.preventDefault();
    if (!form.amount) return;
    setSaving(true);
    setError(null);
    try {
      await financeApi.createTransaction(household.id, {
        ...form,
        amount: Number(form.amount),
        category_id: form.category_id || null,
      });
      setForm((f) => ({ ...f, amount: '', description: '' }));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteTransaction() {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await financeApi.removeTransaction(household.id, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div>
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="card">
            <h4 style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
              Zajedničko — {summary.month}
            </h4>
            <p style={{ fontSize: 20, fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--success)' }}>+{formatMoney(summary.household.income)}</span>
              {'  '}
              <span style={{ color: 'var(--danger)' }}>-{formatMoney(summary.household.expense)}</span>
            </p>
          </div>
          <div className="card">
            <h4 style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
              Moje lično — {summary.month}
            </h4>
            <p style={{ fontSize: 20, fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--success)' }}>+{formatMoney(summary.personal.income)}</span>
              {'  '}
              <span style={{ color: 'var(--danger)' }}>-{formatMoney(summary.personal.expense)}</span>
            </p>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Nova transakcija</h3>
        <form onSubmit={handleAddTransaction} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 110 }} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option value="expense">Trošak</option>
            <option value="income">Prihod</option>
          </select>
          <input
            className="input"
            type="number"
            step="0.01"
            placeholder="Iznos"
            style={{ width: 110 }}
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
          <input
            className="input"
            placeholder="Opis"
            style={{ flex: 1, minWidth: 140 }}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <select
            className="input"
            style={{ width: 150 }}
            value={form.category_id}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
          >
            <option value="">Bez kategorije</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            style={{ width: 140 }}
            value={form.occurred_at}
            onChange={(e) => setForm((f) => ({ ...f, occurred_at: e.target.value }))}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={form.personal}
              onChange={(e) => setForm((f) => ({ ...f, personal: e.target.checked }))}
            />
            Lično
          </label>
          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? 'Dodavanje...' : 'Dodaj'}
          </button>
        </form>
      </div>

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <h3 style={{ marginBottom: 12 }}>Zajedničke transakcije</h3>
          <TransactionList items={householdTx} onDelete={(id) => setPendingDeleteId(id)} />
        </div>
        <div>
          <h3 style={{ marginBottom: 12 }}>Moje lične transakcije</h3>
          <TransactionList items={personalTx} onDelete={(id) => setPendingDeleteId(id)} />
        </div>
      </div>

      {pendingDeleteId && (
        <ConfirmDialog
          message="Obrisati ovu transakciju?"
          onConfirm={confirmDeleteTransaction}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
}

function TransactionList({ items, onDelete }) {
  const [filterText, setFilterText] = useState('');
  const filtered = items.filter((t) => (t.description || '').toLowerCase().includes(filterText.toLowerCase()));

  return (
    <div>
      <input
        className="input"
        placeholder="🔍 Pretraži..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        style={{ marginBottom: 10, fontSize: 13 }}
      />
      {filtered.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Nema transakcija.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((t) => (
            <div
              key={t.id}
              className="card"
              style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.description || '(bez opisa)'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {t.occurred_at} {t.finance_categories && `· ${t.finance_categories.name}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: t.type === 'income' ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {t.type === 'income' ? '+' : '-'}
                  {formatMoney(t.amount)}
                </span>
                <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => onDelete(t.id)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BudgetsTab() {
  const { household } = useHousehold();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  async function load() {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const [budRes, catRes] = await Promise.all([
        financeApi.listBudgets(household.id),
        financeApi.listCategories(household.id),
      ]);
      setBudgets(budRes.data);
      setCategories(catRes.data);
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
    if (!categoryId || !limit) return;
    try {
      await financeApi.createBudget(household.id, categoryId, Number(limit));
      setCategoryId('');
      setLimit('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmDelete() {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await financeApi.removeBudget(household.id, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div>
      <div className="card" style={{ marginBottom: 20, maxWidth: 500 }}>
        <h3 style={{ marginBottom: 12 }}>Novi budžet</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>
          Mjesečni limit potrošnje po kategoriji (samo za zajedničke transakcije).
        </p>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10 }}>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="" disabled>
              Izaberi kategoriju...
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="number"
            step="0.01"
            placeholder="Limit"
            style={{ width: 120 }}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            required
          />
          <button className="btn btn-primary" type="submit">
            Dodaj
          </button>
        </form>
      </div>

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {budgets.map((b) => {
          const pct = b.monthly_limit > 0 ? Math.min(100, (b.spent / b.monthly_limit) * 100) : 0;
          const over = b.spent > b.monthly_limit;
          return (
            <div key={b.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{b.finance_categories?.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: over ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    {formatMoney(b.spent)} / {formatMoney(b.monthly_limit)}
                  </span>
                  <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => setPendingDeleteId(b.id)}>
                    ✕
                  </button>
                </div>
              </div>
              <div style={{ height: 6, background: 'var(--bg-surface-raised)', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: over ? 'var(--danger)' : 'var(--accent)',
                  }}
                />
              </div>
            </div>
          );
        })}
        {budgets.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nema budžeta još.</p>}
      </div>

      {pendingDeleteId && (
        <ConfirmDialog message="Ukloniti ovaj budžet?" onConfirm={confirmDelete} onCancel={() => setPendingDeleteId(null)} />
      )}
    </div>
  );
}

const FREQUENCY_LABELS = { weekly: 'Sedmično', monthly: 'Mjesečno', yearly: 'Godišnje', once: 'Jednokratno' };

function BillsTab() {
  const { household } = useHousehold();
  const [subscriptions, setSubscriptions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    next_due_date: new Date().toISOString().slice(0, 10),
    category_id: '',
    reminder_days_before: 3,
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const [subRes, catRes] = await Promise.all([
        financeApi.listSubscriptions(household.id),
        financeApi.listCategories(household.id),
      ]);
      setSubscriptions(subRes.data);
      setCategories(catRes.data);
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
    if (!form.name.trim() || !form.amount) return;
    setSaving(true);
    setError(null);
    try {
      await financeApi.createSubscription(household.id, {
        ...form,
        amount: Number(form.amount),
        category_id: form.category_id || null,
      });
      setForm((f) => ({ ...f, name: '', amount: '' }));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await financeApi.removeSubscription(household.id, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function isDueSoon(dateStr, days) {
    const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= (days ?? 3);
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 4 }}>Novi račun / pretplata</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
          Automatski se kreira task "Plati: {'{naziv}'}" sa rokom na datum dospijeća. Kad ga završiš, sljedeći ciklus se
          sam kreira.
        </p>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Naziv (npr. Struja)"
            style={{ flex: 1, minWidth: 140 }}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            className="input"
            type="number"
            step="0.01"
            placeholder="Iznos"
            style={{ width: 100 }}
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
          <select className="input" style={{ width: 130 }} value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}>
            <option value="weekly">Sedmično</option>
            <option value="monthly">Mjesečno</option>
            <option value="yearly">Godišnje</option>
            <option value="once">Jednokratno</option>
          </select>
          <input
            className="input"
            type="date"
            style={{ width: 150 }}
            value={form.next_due_date}
            onChange={(e) => setForm((f) => ({ ...f, next_due_date: e.target.value }))}
          />
          <select
            className="input"
            style={{ width: 150 }}
            value={form.category_id}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
          >
            <option value="">Bez kategorije</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? 'Dodavanje...' : 'Dodaj'}
          </button>
        </form>
      </div>

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {subscriptions.map((s) => (
          <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {formatMoney(s.amount)} · {FREQUENCY_LABELS[s.frequency]} ·{' '}
                <span style={{ color: isDueSoon(s.next_due_date, s.reminder_days_before) ? 'var(--danger)' : 'var(--text-muted)' }}>
                  dospijeva {s.next_due_date}
                </span>
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => setPendingDeleteId(s.id)}>
              Obriši
            </button>
          </div>
        ))}
        {subscriptions.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nema računa još.</p>}
      </div>

      {pendingDeleteId && (
        <ConfirmDialog message="Obrisati ovaj račun?" onConfirm={confirmDelete} onCancel={() => setPendingDeleteId(null)} />
      )}
    </div>
  );
}

function WhoOwesTab() {
  const { household } = useHousehold();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!household) return;
    setLoading(true);
    financeApi
      .getWhoOwes(household.id)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [household?.id]);

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;
  if (error) return <p className="text-error">{error}</p>;
  if (!data) return null;

  return (
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
        Prost razrez zajedničkih troškova za {data.month}: ukupno {formatMoney(data.total)}, podijeljeno jednako na{' '}
        {data.breakdown.length} člana ({formatMoney(data.fairShare)} po osobi).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.breakdown.map((b) => (
          <div key={b.profile_id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{b.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Platio/la: {formatMoney(b.paid)}</div>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: b.balance >= 0 ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {b.balance >= 0 ? `Potražuje ${formatMoney(b.balance)}` : `Duguje ${formatMoney(Math.abs(b.balance))}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
