import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { supabase } from '../lib/supabaseClient.js';

const router = Router({ mergeParams: true });

// Ove app-ove household NE MOŽE isključiti (osnova sistema, ne "prava" extension)
const CORE_APPS = ['core.tasks', 'core.dashboard', 'core.notifications', 'core.email'];

// GET /households/:householdId/apps -> sve registrovane app-ove + da li su uključene za ovo domaćinstvo
router.get('/', requireAuth, requireMembership, async (req, res) => {
  const [{ data: registry, error: regError }, { data: householdApps, error: haError }] = await Promise.all([
    supabase.from('apps_registry').select('*').order('name'),
    supabase.from('household_apps').select('*').eq('household_id', req.params.householdId),
  ]);

  if (regError) return res.status(500).json({ error: regError.message });
  if (haError) return res.status(500).json({ error: haError.message });

  const merged = registry.map((app) => {
    const override = householdApps.find((ha) => ha.app_key === app.key);
    return {
      ...app,
      enabled: override ? override.enabled : true, // default: uključeno dok se ne isključi
      is_core: CORE_APPS.includes(app.key),
    };
  });

  res.json({ data: merged });
});

// PATCH /households/:householdId/apps/:appKey -> uključi/isključi app za ovo domaćinstvo
router.patch('/:appKey', requireAuth, requireMembership, async (req, res) => {
  if (!['owner', 'admin'].includes(req.membership.role)) {
    return res.status(403).json({ error: 'Samo owner ili admin mogu upravljati app-ovima' });
  }

  if (CORE_APPS.includes(req.params.appKey)) {
    return res.status(400).json({ error: 'Ova app je dio osnovnog sistema i ne može se isključiti' });
  }

  const { enabled } = req.body;

  const { data, error } = await supabase
    .from('household_apps')
    .upsert(
      { household_id: req.params.householdId, app_key: req.params.appKey, enabled, updated_at: new Date().toISOString() },
      { onConflict: 'household_id,app_key' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

export default router;
