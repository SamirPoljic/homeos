import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    'UPOZORENJE: SUPABASE_URL ili SUPABASE_SERVICE_ROLE_KEY nisu postavljeni u .env'
  );
}

// Backend uvijek koristi service_role key (puni pristup, mimoilazi RLS)
// jer mi sami radimo autorizaciju kroz requireMembership middleware.
// Service role key se NIKAD ne šalje na frontend.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});
