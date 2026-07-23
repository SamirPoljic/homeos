import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { requireScope } from '../middleware/requireScope.js';
import { supabase } from '../lib/supabaseClient.js';
import { emit } from '../lib/eventBus.js';

const router = Router({ mergeParams: true });

const scoped = [requireAuth, requireMembership, requireScope('tasks')];

// Helper reusable iz svih ruta koje kreiraju task
export async function createTaskRow(householdId, userId, fields) {
  const { title, description, due_date, priority, assigned_to, visibility } = fields;
  if (!title) throw Object.assign(new Error('title je obavezan'), { status: 400 });

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      household_id: householdId,
      title,
      description,
      due_date,
      priority,
      assigned_to,
      visibility,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });

  await emit(householdId, 'task.created', data, { entityType: 'task', entityId: data.id });

  if (data.assigned_to) {
    await emit(householdId, 'task.assigned', data, { entityType: 'task', entityId: data.id });
  }

  return data;
}

// GET /households/:householdId/tasks
router.get('/', ...scoped, async (req, res) => {
  const { assigned_to, completed, tag, priority } = req.query;

  let query = supabase
    .from('tasks')
    .select('*, subtasks(id, title, completed, position), task_tags(tags(id, name, color))')
    .eq('household_id', req.params.householdId)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (assigned_to) query = query.eq('assigned_to', assigned_to);
  if (completed !== undefined) query = query.eq('completed', completed === 'true');
  if (priority) query = query.eq('priority', priority);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const filtered = tag
    ? data.filter((t) => t.task_tags.some((tt) => tt.tags.id === tag))
    : data;

  res.json({ data: filtered });
});

// POST /households/:householdId/tasks
router.post('/', ...scoped, async (req, res) => {
  try {
    const data = await createTaskRow(req.params.householdId, req.user.id, req.body);
    res.status(201).json({ data });
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// GET /households/:householdId/tasks/:taskId
router.get('/:taskId', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, subtasks(id, title, completed, position), task_tags(tags(id, name, color))')
    .eq('id', req.params.taskId)
    .eq('household_id', req.params.householdId)
    .single();

  if (error) return res.status(404).json({ error: 'Task nije pronađen' });
  res.json({ data });
});

// PATCH /households/:householdId/tasks/:taskId
router.patch('/:taskId', ...scoped, async (req, res) => {
  const { data: before } = await supabase
    .from('tasks')
    .select('assigned_to')
    .eq('id', req.params.taskId)
    .single();

  const updates = { ...req.body, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', req.params.taskId)
    .eq('household_id', req.params.householdId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // ako je assigned_to promijenjen (i postavljen), emituj task.assigned
  if (updates.assigned_to && updates.assigned_to !== before?.assigned_to) {
    await emit(req.params.householdId, 'task.assigned', data, { entityType: 'task', entityId: data.id });
  }

  res.json({ data });
});

// PATCH /households/:householdId/tasks/:taskId/complete
router.patch('/:taskId/complete', ...scoped, async (req, res) => {
  const { completed = true } = req.body;

  const { data, error } = await supabase
    .from('tasks')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      status: completed ? 'done' : 'todo',
    })
    .eq('id', req.params.taskId)
    .eq('household_id', req.params.householdId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (completed) {
    await emit(req.params.householdId, 'task.completed', data, { entityType: 'task', entityId: data.id });
  }

  res.json({ data });
});

// PATCH /households/:householdId/tasks/:taskId/status
// Koristi Kanban za pomjeranje kartice između kolona (todo/doing/done)
router.patch('/:taskId/status', ...scoped, async (req, res) => {
  const { status } = req.body;
  if (!['todo', 'doing', 'done'].includes(status)) {
    return res.status(400).json({ error: 'status mora biti todo, doing ili done' });
  }

  const isDone = status === 'done';

  const { data, error } = await supabase
    .from('tasks')
    .update({
      status,
      completed: isDone,
      completed_at: isDone ? new Date().toISOString() : null,
    })
    .eq('id', req.params.taskId)
    .eq('household_id', req.params.householdId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (isDone) {
    await emit(req.params.householdId, 'task.completed', data, { entityType: 'task', entityId: data.id });
  }

  res.json({ data });
});

// DELETE /households/:householdId/tasks/:taskId
router.delete('/:taskId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', req.params.taskId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ---------- Subtasks ----------

// POST /households/:householdId/tasks/:taskId/subtasks
router.post('/:taskId/subtasks', ...scoped, async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title je obavezan' });

  const { data, error } = await supabase
    .from('subtasks')
    .insert({ task_id: req.params.taskId, title })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ data });
});

// PATCH /households/:householdId/subtasks/:subtaskId
router.patch('/subtasks/:subtaskId', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('subtasks')
    .update(req.body)
    .eq('id', req.params.subtaskId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// DELETE /households/:householdId/subtasks/:subtaskId
router.delete('/subtasks/:subtaskId', ...scoped, async (req, res) => {
  const { error } = await supabase.from('subtasks').delete().eq('id', req.params.subtaskId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ---------- Tags on a task ----------

// POST /households/:householdId/tasks/:taskId/tags/:tagId
router.post('/:taskId/tags/:tagId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('task_tags')
    .insert({ task_id: req.params.taskId, tag_id: req.params.tagId });

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ data: { ok: true } });
});

// DELETE /households/:householdId/tasks/:taskId/tags/:tagId
router.delete('/:taskId/tags/:tagId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('task_tags')
    .delete()
    .eq('task_id', req.params.taskId)
    .eq('tag_id', req.params.tagId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
