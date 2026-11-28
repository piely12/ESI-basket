-- Texte de la convocation dans l'app : « Vous êtes convoqué(e) pour le match contre [Équipe] à [heure]. »
-- Apply after migrations 001 through 042. Modifie la fonction existante sans la réécrire.
begin;

do $migration$
declare
  v_definition text;
  v_original text;
  v_old_body constant text := '''Tu es retenu(e) pour le match ESI contre ''||v_opponent||''. ''||v_when';
  v_new_body constant text :=
    '''Vous êtes convoqué(e) pour le match contre ''||v_opponent'
    || '||coalesce((select '' à ''||(extract(hour from m.scheduled_at at time zone ''Africa/Abidjan''))::integer::text||''h'''
    || '||case when extract(minute from m.scheduled_at at time zone ''Africa/Abidjan'')::integer<>0'
    || ' then lpad((extract(minute from m.scheduled_at at time zone ''Africa/Abidjan''))::integer::text,2,''0'') else '''' end'
    || ' from public.matches m where m.id=p_match_id and m.kickoff_confirmed),'''')||''. ''||v_when';
begin
  v_definition := pg_get_functiondef('public.publish_match_composition(uuid,uuid)'::regprocedure);
  v_original := v_definition;
  if position(v_old_body in v_definition) = 0 then
    raise exception 'publish_match_composition has an unexpected notification text';
  end if;
  v_definition := replace(v_definition, v_old_body, v_new_body);
  v_definition := replace(v_definition, '''Sélection officielle''', '''Convocation''');
  if v_definition = v_original or position('Vous êtes convoqué(e)' in v_definition) = 0 then
    raise exception 'Could not update the convocation text';
  end if;
  execute v_definition;
end;
$migration$;

commit;
