import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { requireScope } from '../middleware/requireScope.js';
import { supabase } from '../lib/supabaseClient.js';
import { emit } from '../lib/eventBus.js';
import { createTaskRow } from './tasks.js';

const router = Router({ mergeParams: true });
const scoped = [requireAuth, requireMembership, requireScope('kanban')];

// ---------- Boards ----------

// GET /households/:householdId/boards
router.get('/', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('boards')
    .select('*, board_columns(*, board_cards(*, tasks(id, title, completed, priority, assigned_to)))')
    .eq('household_id', req.params.householdId)
    .order('created_at');

  if (error) return res.status(500).json({ error: error.message });

  const sorted = data.map((board) => ({
    ...board,
    board_columns: [...board.board_columns]
      .sort((a, b) => a.position - b.position)
      .map((col) => ({ ...col, board_cards: [...col.board_cards].sort((a, b) => a.position - b.position) })),
  }));

  res.json({ data: sorted });
});

// POST /households/:householdId/boards -> kreira board + 3 default kolone (To do/Doing/Done)
router.post('/', ...scoped, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name je obavezan' });

  const { data: board, error } = await supabase
    .from('boards')
    .insert({ household_id: req.params.householdId, name })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const { error: colError } = await supabase.from('board_columns').insert([
    { board_id: board.id, name: 'To do', position: 0 },
    { board_id: board.id, name: 'Doing', position: 1 },
    { board_id: board.id, name: 'Done', position: 2, is_done: true },
  ]);

  if (colError) return res.status(500).json({ error: colError.message });

  res.status(201).json({ data: board });
});

// DELETE /households/:householdId/boards/:boardId
router.delete('/:boardId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('boards')
    .delete()
    .eq('id', req.params.boardId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ---------- Columns ----------

// POST /households/:householdId/boards/:boardId/columns
router.post('/:boardId/columns', ...scoped, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name je obavezan' });

  const { count } = await supabase
    .from('board_columns')
    .select('id', { count: 'exact', head: true })
    .eq('board_id', req.params.boardId);

  const { data, error } = await supabase
    .from('board_columns')
    .insert({ board_id: req.params.boardId, name, position: count ?? 0 })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ data });
});

// PATCH /households/:householdId/boards/:boardId/columns/:columnId
router.patch('/:boardId/columns/:columnId', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('board_columns')
    .update(req.body)
    .eq('id', req.params.columnId)
    .eq('board_id', req.params.boardId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// DELETE /households/:householdId/boards/:boardId/columns/:columnId
router.delete('/:boardId/columns/:columnId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('board_columns')
    .delete()
    .eq('id', req.params.columnId)
    .eq('board_id', req.params.boardId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ---------- Cards ----------

// POST /households/:householdId/boards/:boardId/columns/:columnId/cards
// body: { task_id } za postojeći task, ILI { title, description, due_date, priority, assigned_to } za novi
router.post('/:boardId/columns/:columnId/cards', ...scoped, async (req, res) => {
  try {
    let taskId = req.body.task_id;

    if (!taskId) {
      const task = await createTaskRow(req.params.householdId, req.user.id, req.body);
      taskId = task.id;
    }

    const { count } = await supabase
      .from('board_cards')
      .select('id', { count: 'exact', head: true })
      .eq('column_id', req.params.columnId);

    const { data, error } = await supabase
      .from('board_cards')
      .insert({ column_id: req.params.columnId, task_id: taskId, position: count ?? 0 })
      .select('*, tasks(id, title, completed, priority, assigned_to)')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ data });
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// PATCH /households/:householdId/boards/:boardId/cards/:cardId/move
// body: { column_id, position }
router.patch('/:boardId/cards/:cardId/move', ...scoped, async (req, res) => {
  const { column_id, position } = req.body;
  if (!column_id || position === undefined) {
    return res.status(400).json({ error: 'column_id i position su obavezni' });
  }

  const { data: card, error } = await supabase
    .from('board_cards')
    .update({ column_id, position })
    .eq('id', req.params.cardId)
    .select('*, task_id, tasks(id, completed)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await emit(req.params.householdId, 'card.moved', { card_id: card.id, column_id }, {
    entityType: 'board_card',
    entityId: card.id,
  });

  const { data: targetColumn } = await supabase
    .from('board_columns')
    .select('is_done')
    .eq('id', column_id)
    .single();

  if (targetColumn?.is_done && card.task_id && card.tasks && !card.tasks.completed) {
    const { data: updatedTask } = await supabase
      .from('tasks')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', card.task_id)
      .select()
      .single();

    if (updatedTask) {
      await emit(req.params.householdId, 'task.completed', updatedTask, {
        entityType: 'task',
        entityId: updatedTask.id,
      });
    }
  }

  res.json({ data: card });
});

// DELETE /households/:householdId/boards/:boardId/cards/:cardId
router.delete('/:boardId/cards/:cardId', ...scoped, async (req, res) => {
  const { error } = await supabase.from('board_cards').delete().eq('id', req.params.cardId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
