-- Publicly deliverable editorial media; uploads stay restricted to active
-- videaste/admin sessions and each object is namespaced by its owner.
-- Apply after migrations 001 through 019.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'news-media', 'news-media', true, 20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists news_media_editor_upload on storage.objects;
create policy news_media_editor_upload on storage.objects
for insert to authenticated
with check (
  bucket_id = 'news-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.has_staff_role(array['videaste', 'admin'])
);

commit;
