import { supabase } from '../lib/supabaseClient.js';
import { registerHandler } from '../lib/eventBus.js';

// task.assigned -> kreiraj in-app notifikaciju za osobu kojoj je task dodijeljen
registerHandler('core.notifications', 'task.assigned', async ({ payload }) => {
  if (!payload.assigned_to) return;

  await supabase.from('notifications').insert({
    recipient_id: payload.assigned_to,
    title: 'Dodijeljen ti je task',
    body: payload.title,
    entity_type: 'task',
    entity_id: payload.id,
    channel: 'in_app',
  });
});

// reminder.created -> kreiraj in-app notifikaciju za osobu kojoj je poslata poruka/podsjetnik
registerHandler('core.notifications', 'reminder.created', async ({ payload }) => {
  if (!payload.target_profile_id) return;

  const { data: sender } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', payload.created_by)
    .maybeSingle();

  await supabase.from('notifications').insert({
    recipient_id: payload.target_profile_id,
    title: `Poruka od ${sender?.full_name || sender?.email || 'člana domaćinstva'}`,
    body: payload.title,
    entity_type: 'reminder',
    entity_id: payload.id,
    channel: 'in_app',
  });
});
