-- Bills mogu biti licni ili zajednicki, isto kao transakcije
alter table public.subscriptions
  add column if not exists visibility visibility_level not null default 'household';
