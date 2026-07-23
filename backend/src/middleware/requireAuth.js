import { supabase } from '../lib/supabaseClient.js';

// Provjerava Authorization: Bearer <supabase_jwt> i kači req.user
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Nedostaje autorizacioni token' });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Nevažeći token' });
  }

  req.user = data.user; // { id, email, ... }
  next();
}
