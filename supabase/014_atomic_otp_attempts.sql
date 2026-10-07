-- Atomically consume one OTP verification attempt.
-- Apply after migrations 001 through 013. Callable only with service_role.
begin;

create or replace function public.consume_otp_attempt(p_otp_id uuid)
returns table (user_id uuid, attempts integer, max_attempts integer, code_hash text)
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.otp_codes as otp
  set attempts = otp.attempts + 1
  where otp.id = p_otp_id
    and otp.used_at is null
    and otp.expires_at > now()
    and otp.attempts < otp.max_attempts
  returning otp.user_id, otp.attempts, otp.max_attempts, otp.code_hash;
$$;

revoke all on function public.consume_otp_attempt(uuid) from public, anon, authenticated;
grant execute on function public.consume_otp_attempt(uuid) to service_role;

commit;
