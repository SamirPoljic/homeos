import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabase } from '../lib/supabaseClient.js';

const router = Router();

// GET /auth/me -> vraća profil trenutno ulogovanog korisnika
router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  // Ako profil još ne postoji (prvi login), kreiraj ga
  if (!data) {
    const { data: created, error: createError } = await supabase
      .from('profiles')
      .insert({ id: req.user.id, full_name: req.user.email, email: req.user.email })
      .select()
      .single();

    if (createError) return res.status(500).json({ error: createError.message });
    return res.json({ data: created });
  }

  res.json({ data });
});

export default router;
