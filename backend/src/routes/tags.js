import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { requireScope } from '../middleware/requireScope.js';
import { supabase } from '../lib/supabaseClient.js';

const router = Router({ mergeParams: true });
const scoped = [requireAuth, requireMembership, requireScope('tasks')];

// GET /households/:householdId/tags
router.get('/', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('household_id', req.params.householdId)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// POST /households/:householdId/tags
router.post('/', ...scoped, async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name je obavezan' });

  const { data, error } = await supabase
    .from('tags')
    .insert({ household_id: req.params.householdId, name, color })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ data });
});

// DELETE /households/:householdId/tags/:tagId
router.delete('/:tagId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', req.params.tagId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
