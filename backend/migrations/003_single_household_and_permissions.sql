-- Faza 1 (revizija): jedno domaćinstvo po korisniku + permisije po modulu za članove
-- Pokreni u Supabase SQL Editoru

-- Enforce: jedan profil može biti član samo JEDNOG domaćinstva
alter table public.household_members
  add constraint household_members_one_per_profile unique (profile_id);

-- Permisije po modulu za svakog člana (opt-out model: ako reda nema, pristup je dozvoljen)
create table public.member_permissions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null,       -- 'tasks','kanban','calendar','reminders','notes','finance','life_admin'
  granted boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (household_id, profile_id, scope)
);
