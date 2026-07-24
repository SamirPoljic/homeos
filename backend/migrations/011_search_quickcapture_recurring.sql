-- Faza 6a: Search + Quick Capture + Recurring taskovi
-- Nema novih tabela - recurrence_rule kolona već postoji na tasks i reminders iz Faze 0 šeme.
-- Ova migracija samo dodaje index koji ubrzava pretragu po tekstu.

create index if not exists idx_tasks_title_search on public.tasks using gin (to_tsvector('simple', title));
create index if not exists idx_notes_content_search on public.notes using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,'')));
