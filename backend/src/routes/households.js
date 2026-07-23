import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { supabase } from '../lib/supabaseClient.js';

const router = Router();

// GET /households -> lista household-a kojima korisnik pripada
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('household_members')
    .select('role, households(*)')
    .eq('profile_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// POST /households -> kreira household, kreator postaje 'owner'
router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name je obavezan' });

  const { data: household, error } = await supabase
    .from('households')
    .insert({ name, created_by: req.user.id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const { error: memberError } = await supabase
    .from('household_members')
    .insert({ household_id: household.id, profile_id: req.user.id, role: 'owner' });

  if (memberError) return res.status(500).json({ error: memberError.message });

  res.status(201).json({ data: household });
});

// GET /households/:householdId -> detalji (primjer korištenja requireMembership)
router.get('/:householdId', requireAuth, requireMembership, async (req, res) => {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', req.params.householdId)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

export default router;
