import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { supabase } from '../lib/supabaseClient.js';

const router = Router({ mergeParams: true });

// GET /households/:householdId/shares?entity_type=task&entity_id=...
router.get('/', requireAuth, requireMembership, async (req, res) => {
  const { entity_type, entity_id } = req.query;
  if (!entity_type || !entity_id) {
    return res.status(400).json({ error: 'entity_type i entity_id su obavezni' });
  }

  const { data, error } = await supabase
    .from('entity_shares')
    .select('*, profiles(id, full_name, email)')
    .eq('entity_type', entity_type)
    .eq('entity_id', entity_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// POST /households/:householdId/shares -> podijeli sa specifičnom osobom
router.post('/', requireAuth, requireMembership, async (req, res) => {
  const { entity_type, entity_id, shared_with_profile_id } = req.body;
  if (!entity_type || !entity_id || !shared_with_profile_id) {
    return res.status(400).json({ error: 'entity_type, entity_id i shared_with_profile_id su obavezni' });
  }

  const { data, error } = await supabase
    .from('entity_shares')
    .insert({ entity_type, entity_id, shared_with_profile_id })
    .select('*, profiles(id, full_name, email)')
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Već je podijeljeno sa tom osobom' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json({ data });
});

// DELETE /households/:householdId/shares/:shareId
router.delete('/:shareId', requireAuth, requireMembership, async (req, res) => {
  const { error } = await supabase.from('entity_shares').delete().eq('id', req.params.shareId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
