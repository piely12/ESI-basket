-- Remove the news/editorial module after migrations 001 through 023.
-- Match, team, player, roster, lineup and statistical data are untouched.
begin;

drop policy if exists news_media_editor_upload on storage.objects;

-- These staff links only granted access to the retired videaste workspace.
delete from public.staff where role = 'videaste';
delete from public.roles where key = 'videaste';

drop table if exists public.news_media;
drop table if exists public.news;
drop table if exists public.mvp_awards;

commit;
