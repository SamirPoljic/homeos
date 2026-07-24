-- Faza 7: Extensibility - apps registry UI + probna 3. app (Meal Planner)
-- Pokreni u Supabase SQL Editoru

-- Da li je app uključena/isključena za konkretno domaćinstvo (household stays in control)
create table public.household_apps (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  app_key text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (household_id, app_key)
);

-- Registruj Meal Planner kao novu app (dokaz da se sistem stvarno može proširiti)
insert into public.apps_registry (key, name, version) values
  ('meal-planner', 'Meal Planner', '1.0.0')
on conflict (key) do nothing;

-- Meal Planner podaci - specifično njegovo (plan obroka), ali se oslanja na postojeće
-- shopping_lists/shopping_items tabele umjesto da duplicira sistem namirnica
create table public.meal_plans (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  meal_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner')),
  name text not null,
  ingredients text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_meal_plans_household_date on public.meal_plans(household_id, meal_date);
