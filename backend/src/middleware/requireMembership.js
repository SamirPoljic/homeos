import { supabase } from '../lib/supabaseClient.js';

// Očekuje da je requireAuth već postavio req.user
// Provjerava da req.user pripada :householdId iz putanje, kači req.membership
export async function requireMembership(req, res, next) {
  const { householdId } = req.params;

  if (!householdId) {
    return res.status(400).json({ error: 'Nedostaje householdId u putanji' });
  }

  const { data, error } = await supabase
    .from('household_members')
    .select('id, role')
    .eq('household_id', householdId)
    .eq('profile_id', req.user.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(403).json({ error: 'Nisi član ovog domaćinstva' });
  }

  req.membership = data; // { id, role }
  next();
}
