import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabase } from '../lib/supabaseClient.js';

const router = Router();

// GET /notifications -> moje notifikacije, najnovije prve
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// PATCH /notifications/read-all
router.patch('/read-all', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', req.user.id)
    .is('read_at', null);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data: { ok: true } });
});

// PATCH /notifications/:id/read
router.patch('/:id/read', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('recipient_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

export default router;
