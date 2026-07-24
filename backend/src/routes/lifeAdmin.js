import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { requireScope } from '../middleware/requireScope.js';
import { supabase } from '../lib/supabaseClient.js';

const router = Router({ mergeParams: true });
const scoped = [requireAuth, requireMembership, requireScope('life_admin')];

// ---------- Document categories (registar) ----------

router.get('/document-categories', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('document_categories')
    .select('*')
    .eq('household_id', req.params.householdId)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post('/document-categories', ...scoped, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name je obavezan' });

  const { data, error } = await supabase
    .from('document_categories')
    .insert({ household_id: req.params.householdId, name: name.trim() })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ data });
});

router.delete('/document-categories/:categoryId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('document_categories')
    .delete()
    .eq('id', req.params.categoryId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ---------- Documents (metapodaci - bez file uploada za sada) ----------

router.get('/documents', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('household_id', req.params.householdId)
    .order('expiry_date', { ascending: true, nullsFirst: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post('/documents', ...scoped, async (req, res) => {
  const { name, category, expiry_date, file_url } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name je obavezan' });

  const { data, error } = await supabase
    .from('documents')
    .insert({
      household_id: req.params.householdId,
      name: name.trim(),
      category: category || null,
      expiry_date: expiry_date || null,
      file_url: file_url || '',
      created_by: req.user.id,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ data });
});

router.delete('/documents/:documentId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', req.params.documentId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ---------- Contacts ----------

router.get('/contacts', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('household_id', req.params.householdId)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post('/contacts', ...scoped, async (req, res) => {
  const { name, phone, email, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name je obavezan' });

  const { data, error } = await supabase
    .from('contacts')
    .insert({ household_id: req.params.householdId, name: name.trim(), phone, email, notes })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ data });
});

router.delete('/contacts/:contactId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', req.params.contactId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ---------- Shopping lists + items ----------

router.get('/shopping-lists', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*, shopping_items(*)')
    .eq('household_id', req.params.householdId)
    .order('created_at');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post('/shopping-lists', ...scoped, async (req, res) => {
  const { name } = req.body;

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({ household_id: req.params.householdId, name: name?.trim() || 'Lista' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ data });
});

router.delete('/shopping-lists/:listId', ...scoped, async (req, res) => {
  const { error } = await supabase
    .from('shopping_lists')
    .delete()
    .eq('id', req.params.listId)
    .eq('household_id', req.params.householdId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

router.post('/shopping-lists/:listId/items', ...scoped, async (req, res) => {
  const { name, quantity } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name je obavezan' });

  const { data, error } = await supabase
    .from('shopping_items')
    .insert({ list_id: req.params.listId, name: name.trim(), quantity, added_by: req.user.id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ data });
});

router.patch('/shopping-items/:itemId', ...scoped, async (req, res) => {
  const { data, error } = await supabase
    .from('shopping_items')
    .update(req.body)
    .eq('id', req.params.itemId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.delete('/shopping-items/:itemId', ...scoped, async (req, res) => {
  const { error } = await supabase.from('shopping_items').delete().eq('id', req.params.itemId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
