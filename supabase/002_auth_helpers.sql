-- Apply in Supabase SQL Editor after 001_initial_schema.sql.
-- Permet au serveur (service_role) de retrouver un utilisateur par e-mail
-- sans exposer la table auth.users au navigateur.
begin;

create or replace function public.user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;

commit;
