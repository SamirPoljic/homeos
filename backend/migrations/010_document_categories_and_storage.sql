-- Faza 5 (dodatak): registar kategorija dokumenata + storage bucket za upload fajlova
-- Pokreni u Supabase SQL Editoru

create table public.document_categories (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  unique (household_id, name)
);

-- Storage bucket za dokumente (javno čitljiv preko direktnog linka - dovoljno za MVP,
-- pristup listi dokumenata i dalje kontroliše naš backend/permission sistem)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload documents"
on storage.objects for insert
to authenticated
with check (bucket_id = 'documents');

create policy "Anyone can view uploaded documents"
on storage.objects for select
to public
using (bucket_id = 'documents');

create policy "Authenticated users can delete documents"
on storage.objects for delete
to authenticated
using (bucket_id = 'documents');
