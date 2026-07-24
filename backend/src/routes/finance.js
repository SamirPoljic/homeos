import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { requireScope } from '../middleware/requireScope.js';
import { supabase } from '../lib/supabaseClient.js';

const router = Router({ mergeParams: true });
const scoped = [requireAuth, requireMembership, requireScope('finance')];

// ---------- Categories (zajedničke za cijelo domaćinstvo) ----------

router.get('/categories', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('finance_categories')
    .select('*')
    .eq('household_id', req.params.householdId)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post('/categories', ...scoped, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name je obavezan' });

  const { data, error } = await supabase
    .from('finance_categories')
    .insert({ household_id: req.params.householdId, name: name.trim() })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ data });
});

router.delete('/categories/:categoryId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('finance_categories')
    .delete()
    .eq('id', req.params.categoryId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ---------- Transactions ----------
// ?scope=household (zajedničko, svi vide) | personal (samo moje, samo ja vidim)

router.get('/transactions', ...scoped, async (req, res) => {
  const { scope = 'household' } = req.query;

  let query = supabase
    .from('finance_transactions')
    .select('*, finance_categories(id, name)')
    .eq('household_id', req.params.householdId)
    .order('occurred_at', { ascending: false });

  if (scope === 'personal') {
    query = query.eq('visibility', 'private').eq('paid_by', req.user.id);
  } else {
    query = query.eq('visibility', 'household');
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post('/transactions', ...scoped, async (req, res) => {
  const { type, amount, description, category_id, occurred_at, personal } = req.body;
  if (!type || !amount) return res.status(400).json({ error: 'type i amount su obavezni' });

  const { data, error } = await supabase
    .from('finance_transactions')
    .insert({
      household_id: req.params.householdId,
      type,
      amount,
      description,
      category_id: category_id || null,
      occurred_at: occurred_at || new Date().toISOString().slice(0, 10),
      paid_by: req.user.id,
      visibility: personal ? 'private' : 'household',
    })
    .select('*, finance_categories(id, name)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ data });
});

router.delete('/transactions/:transactionId', ...scoped, async (req, res) => {
  const { data: existing } = await supabase
    .from('finance_transactions')
    .select('paid_by, visibility')
    .eq('id', req.params.transactionId)
    .single();

  if (existing?.visibility === 'private' && existing.paid_by !== req.user.id) {
    return res.status(403).json({ error: 'Ne možeš obrisati tuđu ličnu transakciju' });
  }

  const { error } = await supabase
    .from('finance_transactions')
    .delete()
    .eq('id', req.params.transactionId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ---------- Monthly summary (oba scope-a odjednom) ----------

router.get('/summary', ...scoped, async (req, res) => {
  const targetMonth = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM
  const [y, m] = targetMonth.split('-').map(Number);
  const from = `${targetMonth}-01`;
  const to = new Date(y, m, 0).toISOString().slice(0, 10);

  async function totals(applyFilter) {
    let query = supabase
      .from('finance_transactions')
      .select('type, amount')
      .eq('household_id', req.params.householdId)
      .gte('occurred_at', from)
      .lte('occurred_at', to);
    query = applyFilter(query);
    const { data } = await query;
    const income = (data ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = (data ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense };
  }

  const household = await totals((q) => q.eq('visibility', 'household'));
  const personal = await totals((q) => q.eq('visibility', 'private').eq('paid_by', req.user.id));

  res.json({ data: { month: targetMonth, household, personal } });
});

export default router;
