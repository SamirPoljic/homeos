-- Home OS — inicijalna šema
-- Pokreni ovo u Supabase SQL Editoru (Project -> SQL Editor -> New query)

create extension if not exists "uuid-ossp";

-- ==========================================================
-- 1. Core — Profiles, Households, Members
-- ==========================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create type member_role as enum ('owner', 'admin', 'member');

create table public.household_members (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role member_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (household_id, profile_id)
);

-- ==========================================================
-- 2. Sharing / Visibility
-- ==========================================================

create type visibility_level as enum ('private', 'household', 'specific');

create table public.entity_shares (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,
  entity_id uuid not null,
  shared_with_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, shared_with_profile_id)
);

create index idx_entity_shares_lookup on public.entity_shares(entity_type, entity_id);

-- ==========================================================
-- 3. Tasks + Subtasks + Tags + Kanban
-- ==========================================================

create type task_priority as enum ('low', 'medium', 'high');

create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  priority task_priority default 'medium',
  assigned_to uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  completed boolean not null default false,
  completed_at timestamptz,
  recurrence_rule text,
  visibility visibility_level not null default 'household',
  source_entity_type text,
  source_entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subtasks (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  position int not null default 0
);

create table public.tags (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  color text,
  unique (household_id, name)
);

create table public.task_tags (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

create table public.boards (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.board_columns (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  position int not null default 0
);

create table public.board_cards (
  id uuid primary key default uuid_generate_v4(),
  column_id uuid not null references public.board_columns(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  position int not null default 0
);

create index idx_tasks_household on public.tasks(household_id);
create index idx_tasks_assigned on public.tasks(assigned_to);
create index idx_tasks_due_date on public.tasks(due_date);

-- ==========================================================
-- 4. Calendar + Reminders
-- ==========================================================

create table public.calendar_events (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  visibility visibility_level not null default 'household',
  created_by uuid not null references public.profiles(id),
  source_entity_type text,
  source_entity_id uuid,
  created_at timestamptz not null default now()
);

create type reminder_status as enum ('pending', 'sent', 'dismissed');

create table public.reminders (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  recurrence_rule text,
  target_profile_id uuid references public.profiles(id),
  status reminder_status not null default 'pending',
  entity_type text,
  entity_id uuid,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_reminders_remind_at on public.reminders(remind_at) where status = 'pending';
create index idx_calendar_events_household on public.calendar_events(household_id, start_at);

-- ==========================================================
-- 5. Notes
-- ==========================================================

create table public.notes (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  title text,
  content text,
  is_journal_entry boolean not null default false,
  journal_date date,
  visibility visibility_level not null default 'household',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.note_tags (
  note_id uuid not null references public.notes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (note_id, tag_id)
);

create table public.note_links (
  id uuid primary key default uuid_generate_v4(),
  note_id uuid not null references public.notes(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null
);

-- ==========================================================
-- 6. Finance
-- ==========================================================

create type transaction_type as enum ('expense', 'income');

create table public.finance_categories (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  unique (household_id, name)
);

create table public.finance_transactions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid references public.finance_categories(id),
  type transaction_type not null,
  amount numeric(12,2) not null,
  description text,
  paid_by uuid references public.profiles(id),
  occurred_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid references public.finance_categories(id),
  monthly_limit numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create type bill_frequency as enum ('weekly', 'monthly', 'yearly', 'once');

create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  frequency bill_frequency not null,
  next_due_date date not null,
  category_id uuid references public.finance_categories(id),
  reminder_days_before int default 3,
  created_at timestamptz not null default now()
);

-- ==========================================================
-- 7. Life Admin
-- ==========================================================

create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  file_url text not null,
  category text,
  expiry_date date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text
);

create table public.shopping_lists (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null default 'Shopping List',
  created_at timestamptz not null default now()
);

create table public.shopping_items (
  id uuid primary key default uuid_generate_v4(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  name text not null,
  quantity text,
  checked boolean not null default false,
  added_by uuid references public.profiles(id)
);

-- ==========================================================
-- 8. Notifications + Email preferences
-- ==========================================================

create type notification_channel as enum ('in_app', 'email');

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  channel notification_channel not null,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.email_preferences (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  enabled boolean not null default true,
  digest_frequency text default 'off',
  primary key (profile_id, category)
);

-- ==========================================================
-- 9. Extensibility — Apps registry + Event bus + Automations
-- ==========================================================

create table public.apps_registry (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  name text not null,
  version text,
  installed boolean not null default true,
  installed_at timestamptz not null default now()
);

create table public.app_grants (
  id uuid primary key default uuid_generate_v4(),
  app_id uuid not null references public.apps_registry(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  scope text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.events (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  emitted_by_app text,
  created_at timestamptz not null default now()
);

create index idx_events_household_type on public.events(household_id, event_type, created_at desc);

create table public.event_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  app_key text not null,
  event_type text not null,
  handler_scope text,
  active boolean not null default true,
  unique (app_key, event_type)
);

create table public.automation_rules (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  trigger_event_type text not null,
  condition jsonb,
  action_type text not null,
  action_params jsonb,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ==========================================================
-- Seed: registruj core module kao "apps" (Faza 0 — mehanizam dokazan)
-- ==========================================================

insert into public.apps_registry (key, name, version) values
  ('core.tasks', 'Tasks', '1.0.0'),
  ('core.kanban', 'Kanban', '1.0.0'),
  ('core.calendar', 'Calendar', '1.0.0'),
  ('core.reminders', 'Reminders', '1.0.0'),
  ('core.notes', 'Notes', '1.0.0'),
  ('core.finance', 'Finance', '1.0.0'),
  ('core.life_admin', 'Life Admin', '1.0.0'),
  ('core.notifications', 'Notifications', '1.0.0'),
  ('core.email', 'Email', '1.0.0'),
  ('core.dashboard', 'Dashboard', '1.0.0');
