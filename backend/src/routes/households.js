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
// (jedan korisnik smije biti član samo jednog domaćinstva - vidi household_members_one_per_profile constraint)
router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name je obavezan' });

  const { data: existingMembership } = await supabase
    .from('household_members')
    .select('id')
    .eq('profile_id', req.user.id)
    .maybeSingle();

  if (existingMembership) {
    return res.status(409).json({ error: 'Već si član jednog domaćinstva. Jedan korisnik može pripadati samo jednom domaćinstvu.' });
  }

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

  // Auto-kreiraj default kanban board sa standardnim kolonama
  const { data: board } = await supabase
    .from('boards')
    .insert({ household_id: household.id, name: 'Domaćinstvo' })
    .select()
    .single();

  if (board) {
    await supabase.from('board_columns').insert([
      { board_id: board.id, name: 'To do', position: 0 },
      { board_id: board.id, name: 'Doing', position: 1 },
      { board_id: board.id, name: 'Done', position: 2, is_done: true },
    ]);
  }

  res.status(201).json({ data: household });
});

// Moduli na koje se odnose permisije - Faza 2+ će koristiti ovu listu za stvarno gating-ovanje
export const MODULE_SCOPES = [
  'tasks', 'kanban', 'calendar', 'reminders', 'notes', 'finance', 'life_admin',
];

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

// PATCH /households/:householdId -> promjena imena domaćinstva
router.patch('/:householdId', requireAuth, requireMembership, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name je obavezan' });

  if (!['owner', 'admin'].includes(req.membership.role)) {
    return res.status(403).json({ error: 'Samo owner ili admin mogu mijenjati naziv domaćinstva' });
  }

  const { data, error } = await supabase
    .from('households')
    .update({ name: name.trim() })
    .eq('id', req.params.householdId)
    .select()
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

// GET /households/:householdId/permissions -> matrica član x modul (default granted=true ako reda nema)
router.get('/:householdId/permissions', requireAuth, requireMembership, async (req, res) => {
  const { data: overrides, error } = await supabase
    .from('member_permissions')
    .select('profile_id, scope, granted')
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ data: { scopes: MODULE_SCOPES, overrides } });
});

// PATCH /households/:householdId/permissions -> upsert jednog (profile_id, scope) para
router.patch('/:householdId/permissions', requireAuth, requireMembership, async (req, res) => {
  const { profile_id, scope, granted } = req.body;

  if (!profile_id || !scope || typeof granted !== 'boolean') {
    return res.status(400).json({ error: 'profile_id, scope i granted (bool) su obavezni' });
  }
  if (!MODULE_SCOPES.includes(scope)) {
    return res.status(400).json({ error: 'Nepoznat scope' });
  }
  if (!['owner', 'admin'].includes(req.membership.role)) {
    return res.status(403).json({ error: 'Samo owner ili admin mogu mijenjati permisije' });
  }

  // owner uvijek ima pun pristup - ne dozvoli ograničavanje ownera
  const { data: targetMember } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', req.params.householdId)
    .eq('profile_id', profile_id)
    .maybeSingle();

  if (targetMember?.role === 'owner') {
    return res.status(400).json({ error: 'Owner uvijek ima pristup svim modulima' });
  }

  const { data, error } = await supabase
    .from('member_permissions')
    .upsert(
      { household_id: req.params.householdId, profile_id, scope, granted, updated_at: new Date().toISOString() },
      { onConflict: 'household_id,profile_id,scope' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

export default router;
