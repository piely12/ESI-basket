-- Composition d'équipe de ESI 48-32 ESTP (Journée 1), coach SAIH PIELY.
-- Titulaires : BOTCHI, KOUAO Chris-Ivann, KOUAMÉ, KONAN, KOUASSI.
-- Remplaçants : AMON, GBAGO, YOBOUE, DALOUGOU, KOUMOIN, KEITA, KOUAKOU.
-- Apply after migrations 001 through 039. Toute incohérence annule l'ensemble.
begin;

do $lineup$
declare
  v_esi uuid;
  v_match uuid;
  v_player uuid;
  v_ids jsonb := '[]'::jsonb;
  v_slots jsonb := '{}'::jsonb;
  line record;
begin
  select t.id into v_esi from public.teams t where t.is_esi;
  select m.id into v_match
  from public.matches m join public.teams estp on estp.id = m.away_team_id
  where m.home_team_id = v_esi and estp.name = 'ESTP' and m.round_number = 1;
  if v_esi is null or v_match is null then
    raise exception 'Match ESI - ESTP (J1) introuvable. Appliquer la migration 037 d''abord.';
  end if;

  delete from public.match_lineups l
  using public.players p
  where l.match_id = v_match and l.player_id = p.id and p.team_id = v_esi;

  for line in
    select * from (values
      ( 2, true,  'meneur'),       -- BOTCHI Pethuel
      (14, true,  'arriere'),      -- KOUAO Chris-Ivann
      ( 8, true,  'ailier'),       -- KOUAMÉ Miguel
      (33, true,  'ailier_fort'),  -- KONAN Loukou
      ( 0, true,  'pivot'),        -- KOUASSI Famien
      ( 1, false, null),           -- AMON Loïc
      ( 5, false, null),           -- GBAGO Marc
      ( 4, false, null),           -- YOBOUE Micael
      ( 7, false, null),           -- DALOUGOU Christ-Israël
      (11, false, null),           -- KOUMOIN Péniel
      (25, false, null),           -- KEITA Almamy
      (12, false, null)            -- KOUAKOU De Paul
    ) as roster(jersey, starter, slot)
  loop
    select p.id into v_player from public.players p where p.team_id = v_esi and p.jersey_number = line.jersey;
    if v_player is null then
      raise exception 'Joueur ESI n°% introuvable.', line.jersey;
    end if;
    insert into public.match_lineups (match_id, player_id, is_starter, court_slot)
    values (v_match, v_player, line.starter, line.slot);
    v_ids := v_ids || to_jsonb(v_player::text);
    if line.slot is not null then
      v_slots := v_slots || jsonb_build_object(v_player::text, line.slot);
    end if;
  end loop;

  -- Composition publiée et verrouillée (match terminé) : visible des visiteurs.
  insert into public.match_composition_workflows (
    match_id, team_id, status, draft_selected_player_ids, draft_court_slots,
    published_version, published_at, updated_at
  ) values (v_match, v_esi, 'verrouillee', v_ids, v_slots, 1, now(), now())
  on conflict (match_id, team_id) do update
    set status = 'verrouillee',
        draft_selected_player_ids = excluded.draft_selected_player_ids,
        draft_court_slots = excluded.draft_court_slots,
        published_version = public.match_composition_workflows.published_version + 1,
        published_at = now(),
        updated_at = now();
end;
$lineup$;

commit;
