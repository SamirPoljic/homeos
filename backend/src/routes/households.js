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

// GET /households/:householdId/members -> lista članova sa profilima
router.get('/:householdId/members', requireAuth, requireMembership, async (req, res) => {
  const { data, error } = await supabase
    .from('household_members')
    .select('id, role, joined_at, profiles(id, full_name, email, avatar_url)')
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// POST /households/:householdId/members -> pozovi člana preko emaila
// (MVP: osoba mora već imati Home OS nalog, tj. bar jednom se ulogovala)
router.post('/:householdId/members', requireAuth, requireMembership, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email je obavezan' });

  // samo owner/admin smiju zvati nove članove
  if (!['owner', 'admin'].includes(req.membership.role)) {
    return res.status(403).json({ error: 'Samo owner ili admin mogu pozivati članove' });
  }

  const { data: invitedProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (profileError) return res.status(500).json({ error: profileError.message });

  if (!invitedProfile) {
    return res.status(404).json({
      error: 'Osoba sa tim emailom se još nije registrovala na Home OS. Zamoli je da se prvo registruje, pa pokušaj ponovo.',
    });
  }

  const { data: existing } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', req.params.householdId)
    .eq('profile_id', invitedProfile.id)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'Ta osoba je već član ovog domaćinstva' });
  }

  const { data, error } = await supabase
    .from('household_members')
    .insert({ household_id: req.params.householdId, profile_id: invitedProfile.id, role: 'member' })
    .select('id, role, joined_at, profiles(id, full_name, email, avatar_url)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ data });
});

// PATCH /households/:householdId/members/:memberId -> promjena role
router.patch('/:householdId/members/:memberId', requireAuth, requireMembership, async (req, res) => {
  const { role } = req.body;
  if (!['owner', 'admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Nevažeća rola' });
  }

  if (!['owner', 'admin'].includes(req.membership.role)) {
    return res.status(403).json({ error: 'Samo owner ili admin mogu mijenjati role' });
  }

  const { data, error } = await supabase
    .from('household_members')
    .update({ role })
    .eq('id', req.params.memberId)
    .eq('household_id', req.params.householdId)
    .select('id, role, joined_at, profiles(id, full_name, email, avatar_url)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// DELETE /households/:householdId/members/:memberId -> ukloni člana
router.delete('/:householdId/members/:memberId', requireAuth, requireMembership, async (req, res) => {
  if (!['owner', 'admin'].includes(req.membership.role)) {
    return res.status(403).json({ error: 'Samo owner ili admin mogu uklanjati članove' });
  }

  // ne dozvoli uklanjanje poslednjeg ownera
  const { data: target } = await supabase
    .from('household_members')
    .select('role')
    .eq('id', req.params.memberId)
    .single();

  if (target?.role === 'owner') {
    const { count } = await supabase
      .from('household_members')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', req.params.householdId)
      .eq('role', 'owner');

    if (count <= 1) {
      return res.status(400).json({ error: 'Domaćinstvo mora imati bar jednog ownera' });
    }
  }

  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('id', req.params.memberId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
