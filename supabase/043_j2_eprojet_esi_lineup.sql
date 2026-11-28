-- Composition d'équipe de E. Projet – ESI (Journée 2, 28/11/2026, 19h).
-- Titulaires : AMON, KOUAO Chris-Ivann, KOUAMÉ Miguel, KONAN Loukou, KOUASSI Famien.
-- Remplaçants : BOTCHI, KEITA, GBAGO, KOUMOIN, KOCLA, KOUAKOU, YOBOUE.
-- Apply after migrations 001 through 042. Toute incohérence annule l'ensemble.
begin;
set local lock_timeout = '5s';

do $lineup$
declare
  v_esi uuid;
  v_match uuid;
  v_kickoff timestamptz;
  v_player uuid;
  v_ids jsonb := '[]'::jsonb;
  v_slots jsonb := '{}'::jsonb;
  v_called uuid[] := '{}';
  line record;
begin
  select t.id into v_esi from public.teams t where t.is_esi;
  select m.id, m.scheduled_at into v_match, v_kickoff
  from public.matches m join public.teams home on home.id = m.home_team_id
  where m.away_team_id = v_esi and home.name = 'E. Projet' and m.round_number = 2;
  if v_esi is null or v_match is null then
    raise exception 'Match E. Projet - ESI (J2) introuvable.';
  end if;

  delete from public.match_lineups l
  using public.players p
  where l.match_id = v_match and l.player_id = p.id and p.team_id = v_esi;

  for line in
    select * from (values
      ( 1, true,  'meneur'),       -- AMON Jean Loïc
      (14, true,  'arriere'),      -- KOUAO Chris-Ivann
      ( 8, true,  'ailier'),       -- KOUAMÉ Miguel
      (33, true,  'ailier_fort'),  -- KONAN Loukou
      ( 0, true,  'pivot'),        -- KOUASSI Famien
      ( 2, false, null),           -- BOTCHI Pethuel
      (25, false, null),           -- KEITA Almamy
      ( 5, false, null),           -- GBAGO Marc
      (11, false, null),           -- KOUMOIN Péniel
      ( 9, false, null),           -- KOCLA Alex
      (12, false, null),           -- KOUAKOU De Paul
      ( 4, false, null)            -- YOBOUE Micael
    ) as roster(jersey, starter, slot)
  loop
    select p.id into v_player from public.players p where p.team_id = v_esi and p.jersey_number = line.jersey;
    if v_player is null then
      raise exception 'Joueur ESI n°% introuvable.', line.jersey;
    end if;
    insert into public.match_lineups (match_id, player_id, is_starter, court_slot)
    values (v_match, v_player, line.starter, line.slot);
    v_ids := v_ids || to_jsonb(v_player::text);
    v_called := v_called || v_player;
    if line.slot is not null then
      v_slots := v_slots || jsonb_build_object(v_player::text, line.slot);
    end if;
  end loop;

  -- Convocations : les 12 retenus sont convoqués, les autres joueurs ESI non.
  insert into public.match_rosters (match_id, player_id, is_called_up)
  select v_match, p.id, p.id = any(v_called)
  from public.players p where p.team_id = v_esi
  on conflict (match_id, player_id) do update
    set is_called_up = excluded.is_called_up, updated_at = now();

  -- Composition publiée (verrouillée si le coup d'envoi est passé) : visible des visiteurs.
  insert into public.match_composition_workflows (
    match_id, team_id, status, draft_selected_player_ids, draft_court_slots,
    published_version, published_at, updated_at
  ) values (
    v_match, v_esi, case when v_kickoff <= now() then 'verrouillee' else 'publiee' end,
    v_ids, v_slots, 1, now(), now()
  )
  on conflict (match_id, team_id) do update
    set status = excluded.status,
        draft_selected_player_ids = excluded.draft_selected_player_ids,
        draft_court_slots = excluded.draft_court_slots,
        published_version = public.match_composition_workflows.published_version + 1,
        published_at = now(),
        updated_at = now();
end;
$lineup$;

commit;
