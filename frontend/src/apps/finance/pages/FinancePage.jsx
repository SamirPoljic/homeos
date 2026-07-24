import { useEffect, useState } from 'react';
import { useHousehold } from '../../../core/household/HouseholdContext';
import { financeApi } from '../api';

function formatMoney(n) {
  return Number(n).toFixed(2);
}

export default function FinancePage() {
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

  async function handleDeleteTransaction(id) {
    if (!confirm('Obrisati ovu transakciju?')) return;
    try {
      await financeApi.removeTransaction(household.id, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ marginBottom: 20 }}>Finansije</h1>

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <h3 style={{ marginBottom: 12 }}>Zajedničke transakcije</h3>
          <TransactionList items={householdTx} onDelete={handleDeleteTransaction} />
        </div>
        <div>
          <h3 style={{ marginBottom: 12 }}>Moje lične transakcije</h3>
          <TransactionList items={personalTx} onDelete={handleDeleteTransaction} />
        </div>
      </div>
    </div>
  );
}

function TransactionList({ items, onDelete }) {
  if (items.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Nema transakcija.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((t) => (
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
  );
}
