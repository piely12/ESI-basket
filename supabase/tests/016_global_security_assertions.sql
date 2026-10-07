-- Read-only assertions for 016_global_security_hardening.sql.
-- Run after applying migrations 001 through 016 on a test project.
do $$
declare
  v_missing text;
begin
  select string_agg(t.table_name, ', ' order by t.table_name)
    into v_missing
  from (values
    ('roles'), ('users'), ('teams'), ('competitions'), ('seasons'), ('staff'),
    ('players'), ('matches'), ('match_rosters'), ('match_lineups'),
    ('match_team_stats'), ('match_player_stats'), ('standings'), ('injuries'),
    ('suspensions'), ('convocations'), ('notifications'), ('news'), ('news_media'),
    ('mvp_awards'), ('hall_of_fame'), ('historical_results'), ('contact_messages'),
    ('audit_logs'), ('otp_codes'), ('active_sessions'), ('stats_import_jobs'),
    ('stats_import_checkpoints'), ('rate_limits'), ('match_preparations'),
    ('first_login_otps')
  ) as t(table_name)
  join pg_class c on c.oid = format('public.%I', t.table_name)::regclass
  where not c.relrowsecurity;
  if v_missing is not null then
    raise exception 'RLS disabled on: %', v_missing;
  end if;

  if not has_function_privilege('authenticated', 'public.is_current_app_session()', 'EXECUTE') then
    raise exception 'authenticated cannot execute is_current_app_session';
  end if;
  if has_function_privilege('anon', 'public.is_current_app_session()', 'EXECUTE') then
    raise exception 'anon can execute is_current_app_session';
  end if;
  if has_function_privilege('authenticated', 'public.consume_rate_limit(text,integer,integer)', 'EXECUTE') then
    raise exception 'authenticated can execute the privileged rate limiter';
  end if;

  if has_column_privilege('anon', 'public.matches', 'created_by', 'SELECT')
    or has_column_privilege('authenticated', 'public.matches', 'created_by', 'SELECT') then
    raise exception 'matches.created_by is exposed';
  end if;
  if has_column_privilege('anon', 'public.match_rosters', 'validated_by', 'SELECT')
    or has_column_privilege('authenticated', 'public.match_rosters', 'validated_by', 'SELECT') then
    raise exception 'match_rosters.validated_by is exposed';
  end if;
  if has_column_privilege('anon', 'public.match_player_stats', 'published_by', 'SELECT')
    or has_column_privilege('authenticated', 'public.match_player_stats', 'published_by', 'SELECT') then
    raise exception 'match_player_stats.published_by is exposed';
  end if;
  if has_column_privilege('authenticated', 'public.injuries', 'created_by', 'SELECT')
    or has_column_privilege('authenticated', 'public.suspensions', 'created_by', 'SELECT')
    or has_column_privilege('authenticated', 'public.convocations', 'sent_by', 'SELECT') then
    raise exception 'A sensitive staff identity column is exposed';
  end if;
  if has_table_privilege('anon', 'public.contact_messages', 'INSERT')
    or has_table_privilege('authenticated', 'public.contact_messages', 'INSERT') then
    raise exception 'Direct contact-message insertion remains enabled';
  end if;
  if has_table_privilege('service_role', 'public.audit_logs', 'UPDATE')
    or has_table_privilege('service_role', 'public.audit_logs', 'DELETE') then
    raise exception 'service_role can mutate audit logs';
  end if;
  if not has_table_privilege('service_role', 'public.audit_logs', 'INSERT') then
    raise exception 'service_role cannot append audit logs';
  end if;

  raise notice '016 security assertions passed';
end;
$$;
