import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { requireScope } from '../middleware/requireScope.js';
import { supabase } from '../lib/supabaseClient.js';

const router = Router({ mergeParams: true });
const scoped = [requireAuth, requireMembership, requireScope('tasks')];

// GET /households/:householdId/task-templates
router.get('/', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('household_id', req.params.householdId)
    .order('title');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// POST /households/:householdId/task-templates
router.post('/', ...scoped, async (req, res) => {
  const { title, default_priority } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title je obavezan' });

  const { data, error } = await supabase
    .from('task_templates')
    .insert({
      household_id: req.params.householdId,
      title: title.trim(),
      default_priority: default_priority || 'medium',
      created_by: req.user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Taj task već postoji u registru' });
    }
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json({ data });
});

// PATCH /households/:householdId/task-templates/:templateId
router.patch('/:templateId', ...scoped, async (req, res) => {
  const { title, default_priority } = req.body;

  const { data, error } = await supabase
    .from('task_templates')
    .update({ ...(title !== undefined ? { title: title.trim() } : {}), ...(default_priority ? { default_priority } : {}) })
    .eq('id', req.params.templateId)
    .eq('household_id', req.params.householdId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// DELETE /households/:householdId/task-templates/:templateId
router.delete('/:templateId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('task_templates')
    .delete()
    .eq('id', req.params.templateId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
