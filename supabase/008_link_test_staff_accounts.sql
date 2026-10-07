-- Link existing Supabase Auth users to the four test staff profiles.
-- Create/invite these Auth users first. The transaction stops if a user or
-- matching staff profile is missing, or if a profile is already linked to a
-- different account.
begin;

do $$
declare
  account record;
  staff_record_id uuid;
  auth_user_id uuid;
  match_count integer;
begin
  for account in
    select * from (values
      ('pielysaih650@gmail.com', 'coach'),
      ('davondimes@gmail.com', 'coach_adjoint'),
      ('loicuriel663@gmail.com', 'statisticienne'),
      ('saihuriel118@gmail.com', 'videaste')
    ) as accounts(email, role_name)
  loop
    select count(*), (array_agg(s.id))[1]
      into match_count, staff_record_id
    from public.staff s
    join public.teams t on t.id = s.team_id
    where t.is_esi
      and s.role::text = account.role_name;

    if match_count <> 1 then
      raise exception 'Expected exactly one ESI staff profile for role %; found %',
        account.role_name, match_count;
    end if;

    select count(*), (array_agg(u.id))[1]
      into match_count, auth_user_id
    from auth.users u
    where lower(u.email) = lower(account.email);

    if match_count <> 1 then
      raise exception 'Expected exactly one Supabase Auth user for %; found %',
        account.email, match_count;
    end if;

    if exists (
      select 1 from public.staff s
      where s.id = staff_record_id
        and s.user_id is not null
        and s.user_id <> auth_user_id
    ) then
      raise exception 'Staff profile % is already linked to a different Auth account.', account.role_name;
    end if;

    update public.staff
    set user_id = auth_user_id
    where id = staff_record_id;
  end loop;
end;
$$;

commit;
