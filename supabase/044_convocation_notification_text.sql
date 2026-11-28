-- Texte de la convocation dans l'app :
-- « Vous êtes convoqué pour le match contre [Équipe] à [heure]. »
-- Aucun message pour les joueurs non retenus.
-- Ne modifie pas publish_match_composition : un déclencheur réécrit la
-- notification dès qu'elle est rattachée à une convocation.
-- Apply after migrations 001 through 043.
begin;
set local lock_timeout = '5s';

create or replace function public.rewrite_convocation_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_opponent text;
  v_kickoff timestamptz;
  v_confirmed boolean;
  v_time text := '';
begin
  if new.notification_id is null
    or new.notification_id is not distinct from old.notification_id then
    return new;
  end if;

  -- Joueur non retenu : pas de message.
  if new.event_type = 'selection_retiree' then
    begin
      delete from public.notifications where id = new.notification_id;
    exception when others then
      null; -- never block the publication of the composition
    end;
    return new;
  end if;

  select case when m.home_team_id = new.team_id then away.name else home.name end,
         m.scheduled_at, m.kickoff_confirmed
    into v_opponent, v_kickoff, v_confirmed
  from public.matches m
  join public.teams home on home.id = m.home_team_id
  join public.teams away on away.id = m.away_team_id
  where m.id = new.match_id;

  if v_confirmed and v_kickoff is not null then
    v_time := ' à ' || extract(hour from v_kickoff at time zone 'Africa/Abidjan')::integer || 'h'
      || case when extract(minute from v_kickoff at time zone 'Africa/Abidjan')::integer <> 0
           then lpad(extract(minute from v_kickoff at time zone 'Africa/Abidjan')::integer::text, 2, '0')
           else '' end;
  end if;

  begin
    update public.notifications
    set title = 'Convocation',
        body = 'Vous êtes convoqué pour le match contre ' || coalesce(v_opponent, 'l’adversaire') || v_time || '.'
    where id = new.notification_id;
  exception when others then
    null; -- never block the publication of the composition
  end;
  return new;
end;
$$;

revoke all on function public.rewrite_convocation_notification() from public, anon, authenticated;

drop trigger if exists convocation_notification_text on public.match_composition_notifications;
create trigger convocation_notification_text
after update of notification_id on public.match_composition_notifications
for each row execute function public.rewrite_convocation_notification();

commit;
