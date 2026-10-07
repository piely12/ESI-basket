-- First-login password update. Roles remain in staff/players; these fields
-- belong to public.users, the table already keyed to auth.users.
-- Apply after migrations 001 through 014.
begin;

alter table public.users
  add column if not exists is_active boolean not null default true,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists password_changed_at timestamptz;

-- Existing users retain access. Auth users created after this migration must
-- change their temporary password before opening any workspace.
insert into public.users (id, must_change_password)
select u.id, false from auth.users u
on conflict (id) do nothing;

create or replace function public.create_app_user_security_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (id, must_change_password)
  values (new.id, true)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_app_user_security_row() from public, anon, authenticated;

drop trigger if exists create_app_user_security_row on auth.users;
create trigger create_app_user_security_row
  after insert on auth.users
  for each row execute function public.create_app_user_security_row();

create or replace function public.current_user_access_state()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'is_active', u.is_active,
    'must_change_password', u.must_change_password
  )
  from public.users u
  where u.id = auth.uid();
$$;
revoke all on function public.current_user_access_state() from public, anon;
grant execute on function public.current_user_access_state() to authenticated;

create table if not exists public.first_login_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code_hash text not null check (char_length(code_hash) = 64),
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts = 5),
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table public.first_login_otps enable row level security;
revoke all on public.first_login_otps from public, anon, authenticated;
grant select, insert, update, delete on public.first_login_otps to service_role;
grant select, update on public.users to service_role;

create or replace function public.issue_first_login_otp(
  p_user_id uuid, p_code_hash text, p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  insert into public.first_login_otps (user_id, code_hash, expires_at, attempts, max_attempts, created_at, used_at)
  values (p_user_id, p_code_hash, p_expires_at, 0, 5, now(), null)
  on conflict (user_id) do update
    set code_hash = excluded.code_hash,
        expires_at = excluded.expires_at,
        attempts = 0,
        max_attempts = 5,
        created_at = now(),
        used_at = null
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.issue_first_login_otp(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.issue_first_login_otp(uuid, text, timestamptz) to service_role;

-- Consume one attempt atomically before checking the HMAC in application code.
create or replace function public.consume_first_login_otp(p_user_id uuid)
returns table (otp_id uuid, user_id uuid, attempts integer, max_attempts integer, code_hash text)
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.first_login_otps as otp
  set attempts = otp.attempts + 1
  where otp.user_id = p_user_id
    and otp.used_at is null
    and otp.expires_at > now()
    and otp.attempts < otp.max_attempts
  returning otp.id, otp.user_id, otp.attempts, otp.max_attempts, otp.code_hash;
$$;
revoke all on function public.consume_first_login_otp(uuid) from public, anon, authenticated;
grant execute on function public.consume_first_login_otp(uuid) to service_role;

-- Mark a verified code consumed once; concurrent valid submissions cannot win twice.
create or replace function public.finish_first_login_otp(p_otp_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  update public.first_login_otps
  set used_at = now()
  where id = p_otp_id and user_id = p_user_id
    and used_at is null and expires_at > now() and attempts <= max_attempts;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;
revoke all on function public.finish_first_login_otp(uuid, uuid) from public, anon, authenticated;
grant execute on function public.finish_first_login_otp(uuid, uuid) to service_role;

commit;
