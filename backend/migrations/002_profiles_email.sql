-- Faza 1: dodaj email na profiles (radi lakšeg pronalaska korisnika kod invite-a)
-- Pokreni ovo u Supabase SQL Editoru (New query -> RUN)

alter table public.profiles add column if not exists email text;

-- Popuni email za profile koji već postoje (npr. tvoj testni nalog iz Faze 0)
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;
