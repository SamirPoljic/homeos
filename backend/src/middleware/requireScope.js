import { supabase } from '../lib/supabaseClient.js';

// Očekuje da requireMembership već postavio req.membership
// Owner uvijek prolazi; ostali podliježu member_permissions tabeli (default: dozvoljeno)
export function requireScope(scope) {
  return async function (req, res, next) {
    if (req.membership.role === 'owner') return next();

    const { data, error } = await supabase
      .from('member_permissions')
      .select('granted')
      .eq('household_id', req.params.householdId)
      .eq('profile_id', req.user.id)
      .eq('scope', scope)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    if (data && data.granted === false) {
      return res.status(403).json({ error: `Nemaš pristup modulu "${scope}"` });
    }

    next();
  };
}
