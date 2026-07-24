import { useEffect, useState, Fragment } from 'react';
import { useHousehold } from '../../../core/household/HouseholdContext';
import { mealPlannerApi } from '../api';
import { ConfirmDialog } from '../../../core/components/ConfirmDialog';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Doručak' },
  { id: 'lunch', label: 'Ručak' },
  { id: 'dinner', label: 'Večera' },
];

function startOfWeek(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // ponedjeljak = 0
  date.setDate(date.getDate() - day);
  return date;
}

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAY_NAMES = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];

export default function MealPlannerPage() {
  const { household } = useHousehold();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingSlot, setAddingSlot] = useState(null); // { date, mealType }
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  async function load() {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const from = toDateKey(days[0]);
      const to = toDateKey(days[6]);
      const res = await mealPlannerApi.listPlans(household.id, from, to);
      setPlans(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (household) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, weekStart]);

  function plansFor(dateKey, mealType) {
    return plans.filter((p) => p.meal_date === dateKey && p.meal_type === mealType);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim() || !addingSlot) return;
    try {
      await mealPlannerApi.createPlan(household.id, {
        meal_date: addingSlot.date,
        meal_type: addingSlot.mealType,
        name: name.trim(),
        ingredients: ingredients.trim() || null,
      });
      setName('');
      setIngredients('');
      setAddingSlot(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmDelete() {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await mealPlannerApi.removePlan(household.id, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddToShoppingList(planId) {
    try {
      const res = await mealPlannerApi.addToShoppingList(household.id, planId);
      alert(`Dodano ${res.data.added} sastojaka na listu "Namirnice" (Life Admin).`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1>Meal Planner</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setWeekStart((d) => {
            const nd = new Date(d); nd.setDate(nd.getDate() - 7); return nd;
          })}>‹ Prošla sedmica</button>
          <button className="btn btn-ghost" onClick={() => setWeekStart((d) => {
            const nd = new Date(d); nd.setDate(nd.getDate() + 7); return nd;
          })}>Sljedeća sedmica ›</button>
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
        Ovo je probna "treća app" koja dokazuje extensibility — koristi postojeći shopping list sistem iz Life Admin
        umjesto da pravi svoj paralelni sistem namirnica.
      </p>

      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(7, 1fr)', gap: 8, minWidth: 800 }}>
          <div />
          {days.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
              {DAY_NAMES[i]} {d.getDate()}.{d.getMonth() + 1}.
            </div>
          ))}

          {MEAL_TYPES.map((mt) => (
            <Fragment key={mt.id}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', paddingTop: 8 }}>
                {mt.label}
              </div>
              {days.map((d) => {
                const dateKey = toDateKey(d);
                const dayPlans = plansFor(dateKey, mt.id);
                const isAdding = addingSlot?.date === dateKey && addingSlot?.mealType === mt.id;
                return (
                  <div
                    key={dateKey + mt.id}
                    style={{
                      minHeight: 70,
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 6,
                    }}
                  >
                    {dayPlans.map((p) => (
                      <div
                        key={p.id}
                        className="card"
                        style={{ padding: '6px 8px', marginBottom: 4, fontSize: 12 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                          <span>{p.name}</span>
                          <button className="btn btn-ghost" style={{ padding: '0 4px', fontSize: 10 }} onClick={() => setPendingDeleteId(p.id)}>
                            ✕
                          </button>
                        </div>
                        {p.ingredients && (
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: 10, padding: '2px 4px', marginTop: 2 }}
                            onClick={() => handleAddToShoppingList(p.id)}
                          >
                            + na shopping listu
                          </button>
                        )}
                      </div>
                    ))}

                    {isAdding ? (
                      <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input
                          className="input"
                          style={{ fontSize: 11, padding: '4px 6px' }}
                          placeholder="Naziv jela"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoFocus
                          required
                        />
                        <input
                          className="input"
                          style={{ fontSize: 11, padding: '4px 6px' }}
                          placeholder="Sastojci (odvoji zarezom)"
                          value={ingredients}
                          onChange={(e) => setIngredients(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 6px', flex: 1 }} type="submit">
                            Dodaj
                          </button>
                          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 6px' }} type="button" onClick={() => setAddingSlot(null)}>
                            ✕
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: '2px 4px', width: '100%' }}
                        onClick={() => setAddingSlot({ date: dateKey, mealType: mt.id })}
                      >
                        + dodaj
                      </button>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {pendingDeleteId && (
        <ConfirmDialog message="Obrisati ovaj plan obroka?" onConfirm={confirmDelete} onCancel={() => setPendingDeleteId(null)} />
      )}
    </div>
  );
}
