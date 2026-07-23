import { supabase } from '../lib/supabaseClient.js';
import { registerHandler } from '../lib/eventBus.js';
import { sendEmail } from '../lib/emailService.js';

async function isEmailEnabled(profileId, category) {
  const { data } = await supabase
    .from('email_preferences')
    .select('enabled')
    .eq('profile_id', profileId)
    .eq('category', category)
    .maybeSingle();

  return data ? data.enabled : true; // default: uključeno dok korisnik ne isključi
}

// task.assigned -> email osobi kojoj je task dodijeljen
registerHandler('core.email', 'task.assigned', async ({ payload }) => {
  if (!payload.assigned_to) return;

  const enabled = await isEmailEnabled(payload.assigned_to, 'task_assigned');
  if (!enabled) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', payload.assigned_to)
    .single();

  if (!profile?.email) return;

  await sendEmail({
    to: profile.email,
    subject: `Dodijeljen ti je task: ${payload.title}`,
    html: `
      <p>Zdravo ${profile.full_name || ''},</p>
      <p>Dodijeljen ti je task: <strong>${payload.title}</strong></p>
      ${payload.due_date ? `<p>Rok: ${payload.due_date.slice(0, 10)}</p>` : ''}
      <p style="color:#888;font-size:12px;">Home OS</p>
    `,
  });
});

// reminder.created -> email osobi kojoj je poslata poruka/podsjetnik
registerHandler('core.email', 'reminder.created', async ({ payload }) => {
  if (!payload.target_profile_id) return;

  const enabled = await isEmailEnabled(payload.target_profile_id, 'reminder');
  if (!enabled) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', payload.target_profile_id)
    .single();

  if (!profile?.email) return;

  const { data: sender } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', payload.created_by)
    .maybeSingle();

  await sendEmail({
    to: profile.email,
    subject: `Nova poruka od ${sender?.full_name || sender?.email || 'člana domaćinstva'}`,
    html: `
      <p>Zdravo ${profile.full_name || ''},</p>
      <p><strong>${sender?.full_name || sender?.email}</strong> ti je poslao/la poruku:</p>
      <blockquote style="border-left:3px solid #ff7a00;padding-left:10px;">${payload.title}</blockquote>
      <p style="color:#888;font-size:12px;">Home OS</p>
    `,
  });
});
