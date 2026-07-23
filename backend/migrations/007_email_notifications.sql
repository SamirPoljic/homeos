-- Faza 4: Notifikacije + Email
-- Pokreni u Supabase SQL Editoru

insert into public.event_subscriptions (app_key, event_type, active)
values
  ('core.email', 'task.assigned', true),
  ('core.email', 'reminder.created', true)
on conflict (app_key, event_type) do nothing;
