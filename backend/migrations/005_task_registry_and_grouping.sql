-- Faza 2 (revizija): registar taskova + kanban grupisanje po osobi/statusu
-- Pokreni u Supabase SQL Editoru

-- "Registar" unaprijed definisanih taskova - korisnici BIRAJU odavde umjesto da upisuju slobodan tekst
create table public.task_templates (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  default_priority task_priority default 'medium',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (household_id, title)
);

-- Kanban board može grupisati kolone po statusu (default, kao do sad) ili po osobi
alter table public.boards
  add column if not exists group_by text not null default 'status'
  check (group_by in ('status', 'member'));
