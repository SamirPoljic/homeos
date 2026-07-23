-- Faza 2 (revizija 2): Kanban prestaje biti posebna tabela - čita se direktno iz tasks
-- Pokreni u Supabase SQL Editoru

create type task_status as enum ('todo', 'doing', 'done');

alter table public.tasks add column if not exists status task_status not null default 'todo';

-- backfill: postojeći completed taskovi postaju 'done', ostali 'todo'
update public.tasks set status = 'done' where completed = true;

-- Napomena: tabele boards / board_columns / board_cards ostaju u bazi (neće se koristiti od sada),
-- nije potrebno da ih brišeš - samo se više ne popunjavaju.
