-- The ESI workspace has one coaching account: the head coach.
-- Apply after migrations 001 through 024. Historical migrations remain intact.
begin;

-- Remove the former assistant coach profile so its account no longer resolves
-- to an application role. Auth users and unrelated player profiles are kept.
delete from public.staff where role = 'coach_adjoint';
delete from public.roles where key = 'coach_adjoint';

commit;
