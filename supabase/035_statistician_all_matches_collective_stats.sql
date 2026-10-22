-- Allow the ESI statistician to enter collective match statistics at any time.
-- This draft RPC never changes the calendar match status or published result.
begin;

drop policy if exists match_stats_workflow_staff_read on public.match_stats_workflow;
create policy match_stats_workflow_staff_read on public.match_stats_workflow for select to authenticated
using (public.is_current_app_session() and exists (
  select 1 from public.staff s where s.user_id=auth.uid() and s.role='statisticienne'
));

drop policy if exists team_stats_published_read on public.match_team_stats;
create policy team_stats_published_read on public.match_team_stats for select to anon,authenticated
using (published_at is not null or public.is_team_staff(team_id,array['statisticienne','coach','coach_adjoint'])
  or (public.is_current_app_session() and exists(select 1 from public.staff s where s.user_id=auth.uid() and s.role='statisticienne')));

create or replace function public.save_match_collective_stats_draft(
  p_match_id uuid,
  p_actor_id uuid,
  p_home_score integer,
  p_away_score integer,
  p_home_stats jsonb,
  p_away_stats jsonb,
  p_player_stats jsonb default '[]'::jsonb
) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_esi_team uuid;
  v_match public.matches%rowtype;
  v_expected integer;
  v_received integer;
  v_team uuid;
  v_stats jsonb;
  v_status text;
begin
  select s.team_id into v_esi_team
  from public.staff s join public.teams t on t.id=s.team_id join public.users u on u.id=s.user_id
  where s.user_id=p_actor_id and s.role='statisticienne' and t.is_esi and u.is_active and not u.must_change_password;
  if v_esi_team is null then raise exception 'Statistician access required'; end if;
  select * into v_match from public.matches where id=p_match_id;
  if not found then raise exception 'Match not found'; end if;
  if (p_home_score is null) <> (p_away_score is null)
    or (p_home_score is not null and p_home_score not between 0 and 200)
    or (p_away_score is not null and p_away_score not between 0 and 200)
    or jsonb_typeof(p_home_stats) is distinct from 'object'
    or jsonb_typeof(p_away_stats) is distinct from 'object'
    or jsonb_typeof(p_player_stats) is distinct from 'array' then raise exception 'Invalid statistics payload'; end if;

  if v_esi_team not in (v_match.home_team_id,v_match.away_team_id) and jsonb_array_length(p_player_stats)>0 then
    raise exception 'Individual statistics are only available for ESI matches';
  end if;
  if v_esi_team in (v_match.home_team_id,v_match.away_team_id) then
    select count(*)::integer into v_expected from public.match_rosters r join public.players p on p.id=r.player_id
      where r.match_id=p_match_id and r.is_called_up and p.team_id=v_esi_team;
    select count(distinct x.player_id)::integer into v_received from jsonb_to_recordset(p_player_stats) as x(player_id uuid);
    if (v_expected=0 and v_received>0) or (v_expected>0 and v_received<>v_expected)
      or exists(select 1 from jsonb_to_recordset(p_player_stats) x(player_id uuid) where not exists(
        select 1 from public.match_rosters r join public.players p on p.id=r.player_id
        where r.match_id=p_match_id and r.is_called_up and p.team_id=v_esi_team and p.id=x.player_id)) then
      raise exception 'Submitted players do not match the ESI match roster';
    end if;
  elsif jsonb_array_length(p_player_stats)>0 then
    raise exception 'Individual statistics are only available for ESI matches';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_match_id::text,19));
  select status into v_status from public.match_stats_workflow where match_id=p_match_id for update;
  if v_status='publie' then raise exception 'Reopen published statistics before editing'; end if;

  for v_team,v_stats in select v_match.home_team_id,p_home_stats union all select v_match.away_team_id,p_away_stats loop
    insert into public.match_team_stats(match_id,team_id,points,rebounds,assists,steals,blocks,turnovers,personal_fouls,
      fg_made,fg_attempted,three_made,three_attempted,ft_made,ft_attempted,published_at,published_by)
    values(p_match_id,v_team,(v_stats->>'points')::integer,(v_stats->>'rebounds')::integer,(v_stats->>'assists')::integer,
      (v_stats->>'steals')::integer,(v_stats->>'blocks')::integer,(v_stats->>'turnovers')::integer,(v_stats->>'personal_fouls')::integer,
      (v_stats->>'fg_made')::integer,(v_stats->>'fg_attempted')::integer,(v_stats->>'three_made')::integer,
      (v_stats->>'three_attempted')::integer,(v_stats->>'ft_made')::integer,(v_stats->>'ft_attempted')::integer,null,null)
    on conflict(match_id,team_id) do update set points=excluded.points,rebounds=excluded.rebounds,assists=excluded.assists,
      steals=excluded.steals,blocks=excluded.blocks,turnovers=excluded.turnovers,personal_fouls=excluded.personal_fouls,
      fg_made=excluded.fg_made,fg_attempted=excluded.fg_attempted,three_made=excluded.three_made,
      three_attempted=excluded.three_attempted,ft_made=excluded.ft_made,ft_attempted=excluded.ft_attempted,
      published_at=null,published_by=null,updated_at=now();
  end loop;

  if jsonb_array_length(p_player_stats)>0 then
    insert into public.match_player_stats(match_id,player_id,minutes_played,points,personal_fouls,rebounds_defensive,
      rebounds_offensive,assists,steals,blocks,turnovers,fg_made,fg_attempted,three_made,three_attempted,ft_made,ft_attempted,published_at,published_by)
    select p_match_id,x.player_id,x.minutes_played,x.points,x.personal_fouls,x.rebounds_defensive,x.rebounds_offensive,
      x.assists,x.steals,x.blocks,x.turnovers,x.fg_made,x.fg_attempted,x.three_made,x.three_attempted,x.ft_made,x.ft_attempted,null,null
    from jsonb_to_recordset(p_player_stats) x(player_id uuid,minutes_played numeric,points integer,personal_fouls integer,
      rebounds_defensive integer,rebounds_offensive integer,assists integer,steals integer,blocks integer,turnovers integer,
      fg_made integer,fg_attempted integer,three_made integer,three_attempted integer,ft_made integer,ft_attempted integer)
    on conflict(match_id,player_id) do update set minutes_played=excluded.minutes_played,points=excluded.points,
      personal_fouls=excluded.personal_fouls,rebounds_defensive=excluded.rebounds_defensive,
      rebounds_offensive=excluded.rebounds_offensive,rebounds=case when excluded.rebounds_defensive is null or excluded.rebounds_offensive is null then null else excluded.rebounds_defensive+excluded.rebounds_offensive end,
      assists=excluded.assists,steals=excluded.steals,blocks=excluded.blocks,turnovers=excluded.turnovers,
      fg_made=excluded.fg_made,fg_attempted=excluded.fg_attempted,three_made=excluded.three_made,
      three_attempted=excluded.three_attempted,ft_made=excluded.ft_made,ft_attempted=excluded.ft_attempted,
      published_at=null,published_by=null,updated_at=now();
  end if;

  insert into public.match_stats_workflow(match_id,home_score_draft,away_score_draft,status,review_warnings,
    result_checked,team_stats_checked,player_stats_checked,anomalies_checked,updated_by,updated_at)
  values(p_match_id,p_home_score,p_away_score,'saisie_en_cours','[]'::jsonb,false,false,false,false,p_actor_id,now())
  on conflict(match_id) do update set home_score_draft=excluded.home_score_draft,away_score_draft=excluded.away_score_draft,
    status=case when public.match_stats_workflow.status in ('pret_a_verifier','pret_a_publier','a_corriger') then 'a_corriger' else 'saisie_en_cours' end,
    review_warnings='[]'::jsonb,result_checked=false,team_stats_checked=false,player_stats_checked=false,
    anomalies_checked=false,reviewed_by=null,reviewed_at=null,updated_by=p_actor_id,updated_at=now();
  return 'saved';
end; $$;

revoke all on function public.save_match_collective_stats_draft(uuid,uuid,integer,integer,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_match_collective_stats_draft(uuid,uuid,integer,integer,jsonb,jsonb,jsonb) to service_role;
commit;
