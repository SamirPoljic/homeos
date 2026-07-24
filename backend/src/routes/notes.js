import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { requireScope } from '../middleware/requireScope.js';
import { supabase } from '../lib/supabaseClient.js';

const router = Router({ mergeParams: true });
const scoped = [requireAuth, requireMembership, requireScope('notes')];

// GET /households/:householdId/notes?scope=household|personal
router.get('/', ...scoped, async (req, res) => {
  const { scope = 'household' } = req.query;

  let query = supabase
    .from('notes')
    .select('*')
    .eq('household_id', req.params.householdId)
    .order('created_at', { ascending: true });

  if (scope === 'personal') {
    query = query.eq('visibility', 'private').eq('author_id', req.user.id);
  } else {
    query = query.eq('visibility', 'household');
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// POST /households/:householdId/notes -> nova "stranica" (tab)
router.post('/', ...scoped, async (req, res) => {
  const { title, visibility } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title je obavezan' });

  const { data, error } = await supabase
    .from('notes')
    .insert({
      household_id: req.params.householdId,
      author_id: req.user.id,
      title: title.trim(),
      content: '',
      visibility: visibility === 'private' ? 'private' : 'household',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ data });
});

// PATCH /households/:householdId/notes/:noteId -> izmjena naslova i/ili sadržaja
router.patch('/:noteId', ...scoped, async (req, res) => {
  const { data: existing } = await supabase
    .from('notes')
    .select('author_id, visibility')
    .eq('id', req.params.noteId)
    .single();

  if (existing?.visibility === 'private' && existing.author_id !== req.user.id) {
    return res.status(403).json({ error: 'Ne možeš mijenjati tuđu ličnu bilješku' });
  }

  const { title, content } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;

  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', req.params.noteId)
    .eq('household_id', req.params.householdId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// DELETE /households/:householdId/notes/:noteId
router.delete('/:noteId', ...scoped, async (req, res) => {
  const { data: existing } = await supabase
    .from('notes')
    .select('author_id, visibility')
    .eq('id', req.params.noteId)
    .single();

  if (existing?.visibility === 'private' && existing.author_id !== req.user.id) {
    return res.status(403).json({ error: 'Ne možeš obrisati tuđu ličnu bilješku' });
  }

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', req.params.noteId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
