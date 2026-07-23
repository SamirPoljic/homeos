import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabase } from '../lib/supabaseClient.js';

const router = Router();

export const EMAIL_CATEGORIES = ['task_assigned', 'reminder'];

// GET /profiles/me/email-preferences
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('profile_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  // popuni defaultima kategorije koje korisnik još nije dirao (enabled=true)
  const merged = EMAIL_CATEGORIES.map((category) => {
    const existing = data.find((d) => d.category === category);
    return existing || { profile_id: req.user.id, category, enabled: true, digest_frequency: 'off' };
  });

  res.json({ data: merged });
});

// PATCH /profiles/me/email-preferences
router.patch('/', requireAuth, async (req, res) => {
  const { category, enabled } = req.body;

  if (!EMAIL_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Nepoznata kategorija' });
  }

  const { data, error } = await supabase
    .from('email_preferences')
    .upsert(
      { profile_id: req.user.id, category, enabled },
      { onConflict: 'profile_id,category' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

export default router;
