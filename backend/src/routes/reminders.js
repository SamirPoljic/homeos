import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { requireScope } from '../middleware/requireScope.js';
import { supabase } from '../lib/supabaseClient.js';
import { emit } from '../lib/eventBus.js';

const router = Router({ mergeParams: true });
const scoped = [requireAuth, requireMembership, requireScope('reminders')];

// GET /households/:householdId/reminders -> podsjetnici/poruke namijenjene MENI (default: samo pending)
router.get('/', ...scoped, async (req, res) => {
  const { status = 'pending' } = req.query;

  let query = supabase
    .from('reminders')
    .select('*')
    .eq('household_id', req.params.householdId)
    .eq('target_profile_id', req.user.id)
    .order('created_at', { ascending: false });

  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// POST /households/:householdId/reminders -> pošalji poruku/podsjetnik drugom članu
router.post('/', ...scoped, async (req, res) => {
  const { title, target_profile_id, remind_at } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'title (tekst poruke) je obavezan' });
  if (!target_profile_id) return res.status(400).json({ error: 'target_profile_id je obavezan' });

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      household_id: req.params.householdId,
      title: title.trim(),
      target_profile_id,
      remind_at: remind_at || new Date().toISOString(),
      created_by: req.user.id,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await emit(req.params.householdId, 'reminder.created', data, { entityType: 'reminder', entityId: data.id });

  res.status(201).json({ data });
});

// PATCH /households/:householdId/reminders/:reminderId/dismiss -> samo primalac smije ukloniti svoj podsjetnik
router.patch('/:reminderId/dismiss', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('reminders')
    .update({ status: 'dismissed' })
    .eq('id', req.params.reminderId)
    .eq('household_id', req.params.householdId)
    .eq('target_profile_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

export default router;
