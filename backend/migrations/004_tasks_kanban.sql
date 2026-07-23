-- Faza 2: Tasks + Kanban
-- Pokreni u Supabase SQL Editoru

-- Kolona u kanban boardu može biti označena kao "done" kolona
-- (kad se karta prebaci ovdje, povezani task se automatski markira kao completed)
alter table public.board_columns add column if not exists is_done boolean not null default false;

-- Registruj core.notifications kao listener na task.assigned event
-- (ovo je "ko sluša" mehanizam iz naše ranije diskusije o eventima)
insert into public.event_subscriptions (app_key, event_type, active)
values
  ('core.notifications', 'task.assigned', true),
  ('core.notifications', 'reminder.fired', true)
on conflict (app_key, event_type) do nothing;
