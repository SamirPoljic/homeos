import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { requireScope } from '../middleware/requireScope.js';
import { supabase } from '../lib/supabaseClient.js';
import { emit } from '../lib/eventBus.js';

const router = Router({ mergeParams: true });

const scoped = [requireAuth, requireMembership, requireScope('tasks')];

// Jednostavan model ponavljanja: 'daily' | 'weekly' | 'monthly' (bez pune RRULE komplikacije)
function nextDueDate(currentDueDate, rule) {
  const d = new Date(currentDueDate);
  if (rule === 'daily') d.setDate(d.getDate() + 1);
  else if (rule === 'weekly') d.setDate(d.getDate() + 7);
  else if (rule === 'monthly') d.setMonth(d.getMonth() + 1);
  else return null;
  return d.toISOString().slice(0, 10);
}

// Kad se recurring task završi, kreiraj sljedeći "instancu" istog taska
async function spawnNextOccurrence(task, userId) {
  if (!task.recurrence_rule || !task.due_date) return;

  const newDueDate = nextDueDate(task.due_date, task.recurrence_rule);
  if (!newDueDate) return;

  const { data: newTask, error } = await supabase
    .from('tasks')
    .insert({
      household_id: task.household_id,
      title: task.title,
      description: task.description,
      due_date: newDueDate,
      priority: task.priority,
      assigned_to: task.assigned_to,
      visibility: task.visibility,
      recurrence_rule: task.recurrence_rule,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Greška pri kreiranju sljedeće instance recurring taska:', error.message);
    return;
  }

  await emit(task.household_id, 'task.created', newTask, { entityType: 'task', entityId: newTask.id });
  if (newTask.assigned_to) {
    await emit(task.household_id, 'task.assigned', newTask, { entityType: 'task', entityId: newTask.id });
  }
}

// Helper reusable iz svih ruta koje kreiraju task
export async function createTaskRow(householdId, userId, fields) {
  const { title, description, due_date, priority, assigned_to, visibility, recurrence_rule } = fields;
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
      recurrence_rule: recurrence_rule || null,
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

// Filtrira listu entiteta prema visibility pravilu: household=svi vide, private=samo autor,
// specific=samo oni u entity_shares. Ovo je centralna provjera koja do sada nigdje nije postojala.
async function filterByVisibility(items, userId, entityType, ownerField = 'created_by') {
  const specificIds = items.filter((i) => i.visibility === 'specific').map((i) => i.id);
  let sharedWithMe = new Set();

  if (specificIds.length > 0) {
    const { data: shares } = await supabase
      .from('entity_shares')
      .select('entity_id')
      .eq('entity_type', entityType)
      .eq('shared_with_profile_id', userId)
      .in('entity_id', specificIds);
    sharedWithMe = new Set((shares ?? []).map((s) => s.entity_id));
  }

  return items.filter((item) => {
    if (item.visibility === 'private') return item[ownerField] === userId;
    if (item.visibility === 'specific') return item[ownerField] === userId || sharedWithMe.has(item.id);
    return true; // 'household'
  });
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

  const visible = await filterByVisibility(data, req.user.id, 'task');

  const filtered = tag
    ? visible.filter((t) => t.task_tags.some((tt) => tt.tags.id === tag))
    : visible;

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

  const [visible] = await filterByVisibility([data], req.user.id, 'task');
  if (!visible) return res.status(403).json({ error: 'Nemaš pristup ovom tasku' });

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
    await spawnNextOccurrence(data, req.user.id);
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
    await spawnNextOccurrence(data, req.user.id);
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
