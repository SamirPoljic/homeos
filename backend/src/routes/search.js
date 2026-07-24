import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { supabase } from '../lib/supabaseClient.js';

const router = Router({ mergeParams: true });

// GET /households/:householdId/search?q=...
router.get('/', requireAuth, requireMembership, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ data: { tasks: [], notes: [], contacts: [], documents: [] } });

  const pattern = `%${q}%`;

  const [tasksRes, notesRes, contactsRes, documentsRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, due_date, status')
      .eq('household_id', req.params.householdId)
      .ilike('title', pattern)
      .limit(10),
    supabase
      .from('notes')
      .select('id, title')
      .eq('household_id', req.params.householdId)
      .or(`title.ilike.${pattern},content.ilike.${pattern}`)
      .limit(10),
    supabase
      .from('contacts')
      .select('id, name, phone, email')
      .eq('household_id', req.params.householdId)
      .ilike('name', pattern)
      .limit(10),
    supabase
      .from('documents')
      .select('id, name, category')
      .eq('household_id', req.params.householdId)
      .ilike('name', pattern)
      .limit(10),
  ]);

  res.json({
    data: {
      tasks: tasksRes.data ?? [],
      notes: notesRes.data ?? [],
      contacts: contactsRes.data ?? [],
      documents: documentsRes.data ?? [],
    },
  });
});

export default router;
