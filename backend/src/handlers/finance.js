import { supabase } from '../lib/supabaseClient.js';
import { registerHandler } from '../lib/eventBus.js';
import { createTaskRow } from '../routes/tasks.js';

function advanceDate(dateStr, frequency) {
  const d = new Date(dateStr);
  if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else return null; // 'once' - nema sljedećeg ciklusa
  return d.toISOString().slice(0, 10);
}

// task.completed -> ako je ovaj task nastao iz subscription-a (računa), pomjeri datum i napravi sljedeći
registerHandler('core.finance', 'task.completed', async ({ householdId, payload }) => {
  if (payload.source_entity_type !== 'subscription' || !payload.source_entity_id) return;

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', payload.source_entity_id)
    .single();

  if (!subscription) return;

  const nextDate = advanceDate(subscription.next_due_date, subscription.frequency);
  if (!nextDate) return; // jednokratni račun, ne ponavlja se

  await supabase.from('subscriptions').update({ next_due_date: nextDate }).eq('id', subscription.id);

  const nextTask = await createTaskRow(householdId, payload.created_by, {
    title: `Plati: ${subscription.name}`,
    due_date: nextDate,
    priority: 'high',
  });

  await supabase
    .from('tasks')
    .update({ source_entity_type: 'subscription', source_entity_id: subscription.id })
    .eq('id', nextTask.id);
});
