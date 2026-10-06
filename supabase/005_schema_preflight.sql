-- Preflight check for the schema created by 001_initial_schema.sql.
-- This intentionally fails early if the SQL Editor is connected to another
-- project or if the bootstrap migration was not applied successfully.
begin;

do $$
declare
  missing text[];
begin
  select array_agg(required.table_name order by required.table_name)
    into missing
  from (values
    ('roles'), ('users'), ('teams'), ('competitions'), ('seasons'), ('staff'),
    ('players'), ('matches'), ('match_rosters'), ('match_lineups'),
    ('match_team_stats'), ('match_player_stats'), ('standings'), ('injuries'),
    ('suspensions'), ('convocations'), ('notifications'), ('news'),
    ('news_media'), ('mvp_awards'), ('hall_of_fame'), ('historical_results'),
    ('contact_messages'), ('audit_logs'), ('otp_codes'), ('active_sessions'),
    ('stats_import_jobs'), ('stats_import_checkpoints'), ('rate_limits')
  ) as required(table_name)
  where to_regclass('public.' || required.table_name) is null;

  if missing is not null then
    raise exception 'Migration 005 stopped: expected tables missing from public schema: %', array_to_string(missing, ', ')
      using hint = 'Confirm the SQL Editor is on your new project and run migrations 001 through 004 in order.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff' and column_name = 'user_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'players' and column_name = 'user_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'match_team_stats' and column_name = 'published_at'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'convocations' and column_name = 'sent_by'
  ) then
    raise exception 'Migration 005 stopped: columns do not match the application bootstrap schema.'
      using hint = 'Do not run migrations 006 yet. Check that migration 001 came from this project repository.';
  end if;
end;
$$;

commit;
