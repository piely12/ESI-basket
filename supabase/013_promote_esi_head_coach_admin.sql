-- Give the seeded ESI head coach Admin access without granting it to every coach.
-- Apply after migrations 001 through 012. Existing Auth links are preserved.
begin;

do $$
declare
  v_staff_id uuid;
  v_match_count integer;
begin
  select count(*), (array_agg(s.id))[1]
    into v_match_count, v_staff_id
  from public.staff s
  join public.teams t on t.id = s.team_id
  where t.is_esi = true
    and lower(btrim(s.first_name)) = lower('Uriel Loic « Sakito »')
    and lower(btrim(s.last_name)) = lower('SAIH PILEY')
    and s.role::text in ('coach', 'admin');

  if v_match_count <> 1 then
    raise exception 'Expected exactly one seeded ESI head coach profile (Uriel Loic « Sakito » SAIH PILEY); found %',
      v_match_count;
  end if;

  update public.staff
  set role = 'admin'
  where id = v_staff_id
    and role::text = 'coach';
end;
$$;

commit;
