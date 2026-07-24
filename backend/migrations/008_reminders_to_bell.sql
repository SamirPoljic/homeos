-- Faza 4 (dodatak): podsjetnici/poruke sada idu i u zvono za notifikacije
-- Pokreni u Supabase SQL Editoru

insert into public.event_subscriptions (app_key, event_type, active)
values
  ('core.notifications', 'reminder.created', true)
on conflict (app_key, event_type) do nothing;
