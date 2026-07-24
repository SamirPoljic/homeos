import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { requireScope } from '../middleware/requireScope.js';
import { supabase } from '../lib/supabaseClient.js';
import { emit } from '../lib/eventBus.js';
import { createTaskRow } from './tasks.js';

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

// ---------- Budgets (mjesečni limit po kategoriji, zajedničko) ----------

router.get('/budgets', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('budgets')
    .select('*, finance_categories(id, name)')
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });

  // dodaj koliko je već potrošeno ovaj mjesec po kategoriji (zajedničke transakcije)
  const monthStart = new Date().toISOString().slice(0, 7) + '-01';
  const enriched = await Promise.all(
    data.map(async (b) => {
      const { data: txs } = await supabase
        .from('finance_transactions')
        .select('amount')
        .eq('household_id', req.params.householdId)
        .eq('category_id', b.category_id)
        .eq('type', 'expense')
        .eq('visibility', 'household')
        .gte('occurred_at', monthStart);

      const spent = (txs ?? []).reduce((s, t) => s + Number(t.amount), 0);
      return { ...b, spent };
    })
  );

  res.json({ data: enriched });
});

router.post('/budgets', ...scoped, async (req, res) => {
  const { category_id, monthly_limit } = req.body;
  if (!category_id || !monthly_limit) {
    return res.status(400).json({ error: 'category_id i monthly_limit su obavezni' });
  }

  const { data, error } = await supabase
    .from('budgets')
    .insert({ household_id: req.params.householdId, category_id, monthly_limit })
    .select('*, finance_categories(id, name)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ data });
});

router.delete('/budgets/:budgetId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', req.params.budgetId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ---------- Subscriptions / Bills (računi koji automatski prave task) ----------

function advanceDate(dateStr, frequency) {
  const d = new Date(dateStr);
  if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else return null; // 'once' - nema sljedećeg
  return d.toISOString().slice(0, 10);
}

router.get('/subscriptions', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, finance_categories(id, name)')
    .eq('household_id', req.params.householdId)
    .order('next_due_date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post('/subscriptions', ...scoped, async (req, res) => {
  const { name, amount, frequency, next_due_date, category_id, reminder_days_before, personal } = req.body;
  if (!name?.trim() || !amount || !frequency || !next_due_date) {
    return res.status(400).json({ error: 'name, amount, frequency i next_due_date su obavezni' });
  }

  const visibility = personal ? 'private' : 'household';

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert({
      household_id: req.params.householdId,
      name: name.trim(),
      amount,
      frequency,
      next_due_date,
      category_id: category_id || null,
      reminder_days_before: reminder_days_before ?? 3,
      visibility,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // "a bill can create a task" - auto-kreiraj task za plaćanje ovog računa
  const task = await createTaskRow(req.params.householdId, req.user.id, {
    title: `Plati: ${subscription.name}`,
    due_date: subscription.next_due_date,
    priority: 'high',
    assigned_to: visibility === 'private' ? req.user.id : null,
  });

  await supabase.from('tasks').update({ source_entity_type: 'subscription', source_entity_id: subscription.id }).eq('id', task.id);

  await emit(req.params.householdId, 'bill.created', subscription, {
    entityType: 'subscription',
    entityId: subscription.id,
  });

  res.status(201).json({ data: subscription });
});

router.patch('/subscriptions/:subscriptionId', ...scoped, async (req, res) => {
  const { name, amount, frequency, next_due_date, category_id, reminder_days_before, personal } = req.body;

  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (amount !== undefined) updates.amount = amount;
  if (frequency !== undefined) updates.frequency = frequency;
  if (next_due_date !== undefined) updates.next_due_date = next_due_date;
  if (category_id !== undefined) updates.category_id = category_id || null;
  if (reminder_days_before !== undefined) updates.reminder_days_before = reminder_days_before;
  if (personal !== undefined) updates.visibility = personal ? 'private' : 'household';

  const { data, error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', req.params.subscriptionId)
    .eq('household_id', req.params.householdId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.delete('/subscriptions/:subscriptionId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', req.params.subscriptionId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ---------- Ko duguje (zajedničke transakcije, prost jednak razrez) ----------

router.get('/who-owes', ...scoped, async (req, res) => {
  const targetMonth = req.query.month || new Date().toISOString().slice(0, 7);
  const [y, m] = targetMonth.split('-').map(Number);
  const from = `${targetMonth}-01`;
  const to = new Date(y, m, 0).toISOString().slice(0, 10);

  const { data: members } = await supabase
    .from('household_members')
    .select('profile_id, profiles(full_name, email)')
    .eq('household_id', req.params.householdId);

  const { data: txs } = await supabase
    .from('finance_transactions')
    .select('amount, paid_by')
    .eq('household_id', req.params.householdId)
    .eq('type', 'expense')
    .eq('visibility', 'household')
    .gte('occurred_at', from)
    .lte('occurred_at', to);

  const total = (txs ?? []).reduce((s, t) => s + Number(t.amount), 0);
  const fairShare = members.length > 0 ? total / members.length : 0;

  const breakdown = members.map((m) => {
    const paid = (txs ?? [])
      .filter((t) => t.paid_by === m.profile_id)
      .reduce((s, t) => s + Number(t.amount), 0);
    return {
      profile_id: m.profile_id,
      name: m.profiles?.full_name || m.profiles?.email,
      paid,
      fair_share: fairShare,
      balance: paid - fairShare, // pozitivno = potražuje, negativno = duguje
    };
  });

  res.json({ data: { month: targetMonth, total, fairShare, breakdown } });
});

export default router;
