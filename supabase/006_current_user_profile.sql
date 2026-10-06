-- Apply after 001 through 005 on the new project. This RPC reads the profile
-- tables without exposing their auth user IDs to browser roles.
begin;

create or replace function public.current_user_profile()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when exists (select 1 from public.staff s where s.user_id = auth.uid()) then (
      select jsonb_build_object(
        'role', s.role::text,
        'first_name', s.first_name,
        'last_name', s.last_name,
        'team_id', s.team_id,
        'person_id', s.id
      )
      from public.staff s where s.user_id = auth.uid() limit 1
    )
    when exists (select 1 from public.players p where p.user_id = auth.uid()) then (
      select jsonb_build_object(
        'role', 'joueur',
        'first_name', p.first_name,
        'last_name', p.last_name,
        'team_id', p.team_id,
        'person_id', p.id
      )
      from public.players p where p.user_id = auth.uid() limit 1
    )
    else null::jsonb
  end;
$$;

revoke all on function public.current_user_profile() from public, anon;
grant execute on function public.current_user_profile() to authenticated;

commit;
