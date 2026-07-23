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
    entity_id: payload.task_id,
    channel: 'in_app',
  });
});
