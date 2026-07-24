import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { requireScope } from '../middleware/requireScope.js';
import { supabase } from '../lib/supabaseClient.js';
import { emit } from '../lib/eventBus.js';

const router = Router({ mergeParams: true });
const scoped = [requireAuth, requireMembership, requireScope('meal_planner')];

// GET /households/:householdId/meal-planner/plans?from=&to=
router.get('/plans', ...scoped, async (req, res) => {
  const { from, to } = req.query;

  let query = supabase
    .from('meal_plans')
    .select('*')
    .eq('household_id', req.params.householdId)
    .order('meal_date', { ascending: true });

  if (from) query = query.gte('meal_date', from);
  if (to) query = query.lte('meal_date', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// POST /households/:householdId/meal-planner/plans
router.post('/plans', ...scoped, async (req, res) => {
  const { meal_date, meal_type, name, ingredients } = req.body;
  if (!meal_date || !meal_type || !name?.trim()) {
    return res.status(400).json({ error: 'meal_date, meal_type i name su obavezni' });
  }

  const { data, error } = await supabase
    .from('meal_plans')
    .insert({
      household_id: req.params.householdId,
      meal_date,
      meal_type,
      name: name.trim(),
      ingredients: ingredients || null,
      created_by: req.user.id,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Meal Planner se "uklapa u povezanu mrežu" - emituje event kao i svaki drugi core modul
  await emit(req.params.householdId, 'mealplan.created', data, {
    entityType: 'meal_plan',
    entityId: data.id,
    emittedByApp: 'meal-planner',
  });

  res.status(201).json({ data });
});

// DELETE /households/:householdId/meal-planner/plans/:planId
router.delete('/plans/:planId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('id', req.params.planId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// POST /households/:householdId/meal-planner/plans/:planId/add-to-shopping-list
// Dokaz "build on what exists, don't duplicate it" - koristi POSTOJEĆI shopping_lists sistem
// iz Life Admin modula, ne pravi svoj paralelni sistem namirnica.
router.post('/plans/:planId/add-to-shopping-list', ...scoped, async (req, res) => {
  const { data: plan, error: planError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', req.params.planId)
    .single();

  if (planError || !plan) return res.status(404).json({ error: 'Plan obroka nije pronađen' });
  if (!plan.ingredients?.trim()) return res.status(400).json({ error: 'Ovaj obrok nema navedene sastojke' });

  // Nađi ili napravi listu "Namirnice"
  let { data: list } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('household_id', req.params.householdId)
    .eq('name', 'Namirnice')
    .maybeSingle();

  if (!list) {
    const { data: newList, error: listError } = await supabase
      .from('shopping_lists')
      .insert({ household_id: req.params.householdId, name: 'Namirnice' })
      .select()
      .single();
    if (listError) return res.status(500).json({ error: listError.message });
    list = newList;
  }

  const items = plan.ingredients
    .split(',')
    .map((i) => i.trim())
    .filter(Boolean);

  const rows = items.map((name) => ({ list_id: list.id, name, added_by: req.user.id }));
  const { error: insertError } = await supabase.from('shopping_items').insert(rows);

  if (insertError) return res.status(500).json({ error: insertError.message });
  res.json({ data: { added: items.length, list_id: list.id } });
});

export default router;
