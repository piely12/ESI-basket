-- Additive account controls for invitations and suspension reasons.
-- Apply after migrations 001 through 025. Existing profiles and team data remain.
begin;

alter table public.users
  add column if not exists suspension_reason text;

-- The protected admin journal is read-only; service-role access is used only
-- after the application has confirmed the admin role.
grant select on public.audit_logs to service_role;

create or replace function public.linked_auth_user_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select au.id
  from auth.users au
  join public.users app_user on app_user.id = au.id
  where lower(au.email) = lower(trim(p_email))
    and (app_user.is_active or app_user.must_change_password)
    and (
      exists (select 1 from public.staff s where s.user_id = au.id)
      or exists (select 1 from public.players p where p.user_id = au.id)
    )
  limit 1;
$$;
revoke all on function public.linked_auth_user_by_email(text) from public, anon, authenticated;
grant execute on function public.linked_auth_user_by_email(text) to service_role;

commit;
