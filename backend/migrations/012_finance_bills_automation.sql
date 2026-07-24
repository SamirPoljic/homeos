-- Faza: Finance - budzeti, subscriptions/bills, bill->task automatika
-- Pokreni u Supabase SQL Editoru

insert into public.event_subscriptions (app_key, event_type, active)
values
  ('core.finance', 'task.completed', true)
on conflict (app_key, event_type) do nothing;
