-- Faza 5: Notes (bez izmjene šeme, tabela već postoji), Finance shared/personal, Life Admin
-- Pokreni u Supabase SQL Editoru

-- Finance transakcije mogu biti 'household' (zajedničko) ili 'private' (lično, vidi samo taj korisnik)
alter table public.finance_transactions
  add column if not exists visibility visibility_level not null default 'household';
