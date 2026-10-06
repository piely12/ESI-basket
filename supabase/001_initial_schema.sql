-- Bootstrap schema for a NEW, EMPTY Supabase project only.
-- Do not run against a project containing application tables or data.

begin;

create extension if not exists pgcrypto;

create table if not exists public.roles (
  key text primary key,
  label text not null,
  created_at timestamptz not null default now()
);

insert into public.roles (key, label) values
  ('coach', 'Coach'),
  ('coach_adjoint', 'Coach adjoint'),
  ('statisticienne', 'Statisticienne'),
  ('videaste', 'Vidéaste'),
  ('admin', 'Administrateur')
on conflict (key) do update set label = excluded.label;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  city text,
  logo_url text,
  is_esi boolean not null default false,
  created_at timestamptz not null default now(),
  constraint teams_one_esi check (not is_esi or name <> '')
);
create unique index if not exists teams_single_esi_idx on public.teams (is_esi) where is_esi;

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organizer text,
  created_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete restrict,
  name text not null,
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on),
  unique (competition_id, name)
);
create unique index if not exists seasons_single_current_idx on public.seasons (is_current) where is_current;

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  first_name text not null,
  last_name text not null,
  role text not null references public.roles(key) on update cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  team_id uuid not null references public.teams(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  jersey_number integer,
  position text,
  photo_url text,
  birth_date date,
  status text not null default 'actif' check (status in ('actif', 'blesse', 'suspendu')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jersey_number is null or jersey_number between 0 and 99)
);
create unique index if not exists players_team_jersey_idx on public.players (team_id, jersey_number) where jersey_number is not null;
create index if not exists players_team_status_idx on public.players (team_id, status, jersey_number);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references public.competitions(id) on delete set null,
  season_id uuid references public.seasons(id) on delete set null,
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  scheduled_at timestamptz not null,
  location text,
  status text not null default 'programme' check (status in ('programme', 'a_venir', 'jour_j', 'en_cours', 'termine')),
  home_score integer,
  away_score integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id),
  check ((home_score is null and away_score is null) or (home_score is not null and away_score is not null)),
  check (home_score is null or home_score >= 0),
  check (away_score is null or away_score >= 0)
);
create index if not exists matches_scheduled_idx on public.matches (scheduled_at);
create index if not exists matches_status_scheduled_idx on public.matches (status, scheduled_at);

create table if not exists public.match_rosters (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  is_called_up boolean not null default false,
  response text check (response is null or response in ('pending', 'present', 'absent')),
  validated_at timestamptz,
  validated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, player_id)
);
create index if not exists match_rosters_player_idx on public.match_rosters (player_id, match_id);

create table if not exists public.match_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  is_starter boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);
create index if not exists match_lineups_match_starter_idx on public.match_lineups (match_id, is_starter);

create table if not exists public.match_team_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  rebounds integer not null default 0 check (rebounds >= 0),
  assists integer not null default 0 check (assists >= 0),
  fg_made integer not null default 0 check (fg_made >= 0),
  fg_attempted integer not null default 0 check (fg_attempted >= fg_made),
  three_made integer not null default 0 check (three_made >= 0),
  three_attempted integer not null default 0 check (three_attempted >= three_made),
  ft_made integer not null default 0 check (ft_made >= 0),
  ft_attempted integer not null default 0 check (ft_attempted >= ft_made),
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, team_id)
);

create table if not exists public.match_player_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  minutes_played numeric(5, 2) not null default 0 check (minutes_played >= 0),
  points integer not null default 0 check (points >= 0),
  rebounds integer not null default 0 check (rebounds >= 0),
  assists integer not null default 0 check (assists >= 0),
  steals integer not null default 0 check (steals >= 0),
  blocks integer not null default 0 check (blocks >= 0),
  turnovers integer not null default 0 check (turnovers >= 0),
  fg_made integer not null default 0 check (fg_made >= 0),
  fg_attempted integer not null default 0 check (fg_attempted >= fg_made),
  three_made integer not null default 0 check (three_made >= 0),
  three_attempted integer not null default 0 check (three_attempted >= three_made),
  ft_made integer not null default 0 check (ft_made >= 0),
  ft_attempted integer not null default 0 check (ft_attempted >= ft_made),
  plus_minus integer not null default 0,
  evaluation numeric(6, 2),
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, player_id)
);
create index if not exists match_player_stats_player_match_idx on public.match_player_stats (player_id, match_id);

-- The current competition standings are maintained by the staff until an
-- automated standings calculation is introduced.
create table if not exists public.standings (
  team_id uuid primary key references public.teams(id) on delete cascade,
  played integer not null default 0 check (played >= 0),
  won integer not null default 0 check (won >= 0),
  lost integer not null default 0 check (lost >= 0),
  points_for integer not null default 0,
  points_against integer not null default 0,
  ranking_points integer not null default 0,
  updated_at timestamptz not null default now(),
  check (won + lost <= played)
);

create table if not exists public.injuries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  description text,
  starts_on date not null default current_date,
  ends_on date,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create table if not exists public.suspensions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  reason text,
  starts_on date not null default current_date,
  ends_on date,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create table if not exists public.convocations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null default 'envoyee' check (status in ('envoyee', 'vue', 'confirmee', 'declinee')),
  sent_at timestamptz not null default now(),
  sent_by uuid references auth.users(id) on delete set null,
  unique (match_id, player_id)
);
create index if not exists convocations_player_sent_idx on public.convocations (player_id, sent_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  body text not null,
  category text,
  cover_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists news_published_idx on public.news (published_at desc) where is_published;

create table if not exists public.news_media (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references public.news(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists news_media_order_idx on public.news_media (news_id, sort_order);

create table if not exists public.mvp_awards (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  headline text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (match_id)
);

create table if not exists public.hall_of_fame (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (year, title)
);

create table if not exists public.historical_results (
  id uuid primary key default gen_random_uuid(),
  played_on date,
  home_team_name text not null,
  away_team_name text not null,
  home_score integer,
  away_score integer,
  competition_name text,
  season_name text,
  created_at timestamptz not null default now(),
  check ((home_score is null and away_score is null) or (home_score is not null and away_score is not null))
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  pseudo text not null check (char_length(trim(pseudo)) between 2 and 40),
  message text not null check (char_length(trim(message)) between 5 and 1000),
  status text not null default 'nouveau' check (status in ('nouveau', 'lu', 'traite')),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_actor_created_idx on public.audit_logs (actor_user_id, created_at desc);

create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists otp_codes_user_created_idx on public.otp_codes (user_id, created_at desc);

create table if not exists public.active_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_session_id text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.stats_import_jobs (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  source_file_name text not null,
  source_storage_path text,
  status text not null default 'en_cours' check (status in ('en_cours', 'checkpoint', 'valide', 'rejete')),
  raw_data jsonb not null default '{}'::jsonb,
  proposed_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.stats_import_checkpoints (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.stats_import_jobs(id) on delete cascade,
  section_key text not null,
  proposed_data jsonb not null default '{}'::jsonb,
  reviewed_data jsonb,
  decision text not null default 'pending' check (decision in ('pending', 'validated', 'corrected', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (job_id, section_key)
);

create or replace function public.has_staff_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.staff s
    where s.user_id = auth.uid() and s.role = any (allowed_roles)
  );
$$;
revoke all on function public.has_staff_role(text[]) from public;
grant execute on function public.has_staff_role(text[]) to anon, authenticated;

create or replace function public.is_team_staff(target_team_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1 from public.staff s
    where s.user_id = auth.uid()
      and s.team_id = target_team_id
      and s.role = any (allowed_roles)
  );
$$;
revoke all on function public.is_team_staff(uuid, text[]) from public, anon;
grant execute on function public.is_team_staff(uuid, text[]) to authenticated;

-- Enable RLS for every application table. Service-role requests continue to
-- bypass RLS as intended by Supabase.
alter table public.roles enable row level security;
alter table public.users enable row level security;
alter table public.teams enable row level security;
alter table public.competitions enable row level security;
alter table public.seasons enable row level security;
alter table public.staff enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_rosters enable row level security;
alter table public.match_lineups enable row level security;
alter table public.match_team_stats enable row level security;
alter table public.match_player_stats enable row level security;
alter table public.standings enable row level security;
alter table public.injuries enable row level security;
alter table public.suspensions enable row level security;
alter table public.convocations enable row level security;
alter table public.notifications enable row level security;
alter table public.news enable row level security;
alter table public.news_media enable row level security;
alter table public.mvp_awards enable row level security;
alter table public.hall_of_fame enable row level security;
alter table public.historical_results enable row level security;
alter table public.contact_messages enable row level security;
alter table public.audit_logs enable row level security;
alter table public.otp_codes enable row level security;
alter table public.active_sessions enable row level security;
alter table public.stats_import_jobs enable row level security;
alter table public.stats_import_checkpoints enable row level security;

-- Public reference and competition data.
drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles for select to anon, authenticated using (true);
drop policy if exists teams_read on public.teams;
create policy teams_read on public.teams for select to anon, authenticated using (true);
drop policy if exists competitions_read on public.competitions;
create policy competitions_read on public.competitions for select to anon, authenticated using (true);
drop policy if exists seasons_read on public.seasons;
create policy seasons_read on public.seasons for select to anon, authenticated using (true);
drop policy if exists matches_read on public.matches;
create policy matches_read on public.matches for select to anon, authenticated using (true);
drop policy if exists standings_read on public.standings;
create policy standings_read on public.standings for select to anon, authenticated using (true);
drop policy if exists historical_results_read on public.historical_results;
create policy historical_results_read on public.historical_results for select to anon, authenticated using (true);
drop policy if exists hall_of_fame_read on public.hall_of_fame;
create policy hall_of_fame_read on public.hall_of_fame for select to anon, authenticated using (true);

-- Roster data is public; the birth date and auth user id are intentionally
-- excluded from anon/authenticated column grants.
drop policy if exists players_public_read on public.players;
create policy players_public_read on public.players for select to anon, authenticated using (true);
drop policy if exists players_staff_manage on public.players;
create policy players_staff_manage on public.players for all to authenticated
  using (public.has_staff_role(array['admin']) or public.is_team_staff(team_id, array['coach', 'coach_adjoint']))
  with check (public.has_staff_role(array['admin']) or public.is_team_staff(team_id, array['coach', 'coach_adjoint']));

-- Staff can inspect their own profile; coach/admin can inspect and manage staff.
drop policy if exists staff_self_or_admin_read on public.staff;
create policy staff_self_or_admin_read on public.staff for select to authenticated
  using (user_id = auth.uid() or public.has_staff_role(array['admin'])
    or public.is_team_staff(team_id, array['coach', 'coach_adjoint']));
drop policy if exists staff_admin_manage on public.staff;
create policy staff_admin_manage on public.staff for all to authenticated
  using (public.has_staff_role(array['admin']))
  with check (public.has_staff_role(array['admin']));
drop policy if exists users_self_read on public.users;
create policy users_self_read on public.users for select to authenticated using (id = auth.uid());
drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Sports operations are limited to coach roles and the administrator.
drop policy if exists matches_coach_insert on public.matches;
create policy matches_coach_insert on public.matches for insert to authenticated
  with check (public.has_staff_role(array['admin'])
    or public.is_team_staff(home_team_id, array['coach', 'coach_adjoint'])
    or public.is_team_staff(away_team_id, array['coach', 'coach_adjoint']));
drop policy if exists matches_coach_update on public.matches;
create policy matches_coach_update on public.matches for update to authenticated
  using (public.has_staff_role(array['admin'])
    or public.is_team_staff(home_team_id, array['coach', 'coach_adjoint'])
    or public.is_team_staff(away_team_id, array['coach', 'coach_adjoint']))
  with check (public.has_staff_role(array['admin'])
    or public.is_team_staff(home_team_id, array['coach', 'coach_adjoint'])
    or public.is_team_staff(away_team_id, array['coach', 'coach_adjoint']));
drop policy if exists matches_admin_delete on public.matches;
create policy matches_admin_delete on public.matches for delete to authenticated
  using (public.has_staff_role(array['admin']));

drop policy if exists match_rosters_staff_manage on public.match_rosters;
create policy match_rosters_staff_manage on public.match_rosters for all to authenticated
  using (public.has_staff_role(array['admin']) or exists (
    select 1 from public.matches m join public.players p on p.id = player_id
    where m.id = match_id and p.team_id in (m.home_team_id, m.away_team_id)
      and public.is_team_staff(p.team_id, array['coach', 'coach_adjoint'])
  ))
  with check (public.has_staff_role(array['admin']) or exists (
    select 1 from public.matches m join public.players p on p.id = player_id
    where m.id = match_id and p.team_id in (m.home_team_id, m.away_team_id)
      and public.is_team_staff(p.team_id, array['coach', 'coach_adjoint'])
  ));
drop policy if exists match_rosters_player_read on public.match_rosters;
create policy match_rosters_player_read on public.match_rosters for select to authenticated
  using (exists (select 1 from public.players p where p.id = player_id and p.user_id = auth.uid()));

-- Do not reveal a future lineup until match day in Abidjan. Database RLS is
-- the enforcement layer; the UI condition is only a presentation safeguard.
drop policy if exists lineups_matchday_or_coach_read on public.match_lineups;
create policy lineups_matchday_or_coach_read on public.match_lineups for select to anon, authenticated
  using (
    public.has_staff_role(array['admin'])
    or exists (select 1 from public.matches m join public.players p on p.id = player_id
      where m.id = match_id and p.team_id in (m.home_team_id, m.away_team_id)
        and public.is_team_staff(p.team_id, array['coach', 'coach_adjoint']))
    or exists (
      select 1 from public.matches m
      where m.id = match_id and (
        m.status = 'termine'
        or (m.scheduled_at at time zone 'Africa/Abidjan')::date <= (now() at time zone 'Africa/Abidjan')::date
      )
    )
  );
drop policy if exists lineups_coach_manage on public.match_lineups;
create policy lineups_coach_manage on public.match_lineups for all to authenticated
  using (public.has_staff_role(array['admin']) or exists (
    select 1 from public.matches m join public.players p on p.id = player_id
    where m.id = match_id and p.team_id in (m.home_team_id, m.away_team_id)
      and public.is_team_staff(p.team_id, array['coach', 'coach_adjoint'])
  ))
  with check (public.has_staff_role(array['admin']) or exists (
    select 1 from public.matches m join public.players p on p.id = player_id
    where m.id = match_id and p.team_id in (m.home_team_id, m.away_team_id)
      and public.is_team_staff(p.team_id, array['coach', 'coach_adjoint'])
  ));

-- Match statistics are public only after explicit publication. Players may
-- also read their own rows; only statisticienne/admin may write them.
drop policy if exists team_stats_published_read on public.match_team_stats;
create policy team_stats_published_read on public.match_team_stats for select to anon, authenticated
  using (published_at is not null or public.has_staff_role(array['coach', 'coach_adjoint', 'statisticienne', 'admin']));
drop policy if exists team_stats_statistician_manage on public.match_team_stats;
create policy team_stats_statistician_manage on public.match_team_stats for all to authenticated
  using (public.has_staff_role(array['statisticienne', 'admin']))
  with check (public.has_staff_role(array['statisticienne', 'admin']));

drop policy if exists player_stats_published_or_self_read on public.match_player_stats;
create policy player_stats_published_or_self_read on public.match_player_stats for select to anon, authenticated
  using (
    published_at is not null
    or public.has_staff_role(array['coach', 'coach_adjoint', 'statisticienne', 'admin'])
    or exists (select 1 from public.players p where p.id = player_id and p.user_id = auth.uid())
  );
drop policy if exists player_stats_statistician_manage on public.match_player_stats;
create policy player_stats_statistician_manage on public.match_player_stats for all to authenticated
  using (public.has_staff_role(array['statisticienne', 'admin']))
  with check (public.has_staff_role(array['statisticienne', 'admin']));

drop policy if exists standings_admin_manage on public.standings;
create policy standings_admin_manage on public.standings for all to authenticated
  using (public.has_staff_role(array['admin']))
  with check (public.has_staff_role(array['admin']));

-- Private health and availability data.
drop policy if exists injuries_staff_or_self_read on public.injuries;
create policy injuries_staff_or_self_read on public.injuries for select to authenticated
  using (public.has_staff_role(array['admin']) or exists (select 1 from public.players p where p.id = player_id and
    (p.user_id = auth.uid() or public.is_team_staff(p.team_id, array['coach', 'coach_adjoint']))));
drop policy if exists injuries_coach_manage on public.injuries;
create policy injuries_coach_manage on public.injuries for all to authenticated
  using (public.has_staff_role(array['admin']) or exists (select 1 from public.players p where p.id = player_id and public.is_team_staff(p.team_id, array['coach', 'coach_adjoint'])))
  with check (public.has_staff_role(array['admin']) or exists (select 1 from public.players p where p.id = player_id and public.is_team_staff(p.team_id, array['coach', 'coach_adjoint'])));
drop policy if exists suspensions_staff_or_self_read on public.suspensions;
create policy suspensions_staff_or_self_read on public.suspensions for select to authenticated
  using (public.has_staff_role(array['admin']) or exists (select 1 from public.players p where p.id = player_id and
    (p.user_id = auth.uid() or public.is_team_staff(p.team_id, array['coach', 'coach_adjoint']))));
drop policy if exists suspensions_coach_manage on public.suspensions;
create policy suspensions_coach_manage on public.suspensions for all to authenticated
  using (public.has_staff_role(array['admin']) or exists (select 1 from public.players p where p.id = player_id and public.is_team_staff(p.team_id, array['coach', 'coach_adjoint'])))
  with check (public.has_staff_role(array['admin']) or exists (select 1 from public.players p where p.id = player_id and public.is_team_staff(p.team_id, array['coach', 'coach_adjoint'])));

drop policy if exists convocations_staff_or_player_read on public.convocations;
create policy convocations_staff_or_player_read on public.convocations for select to authenticated
  using (public.has_staff_role(array['admin']) or exists (select 1 from public.players p where p.id = player_id and
    (p.user_id = auth.uid() or public.is_team_staff(p.team_id, array['coach', 'coach_adjoint']))));
drop policy if exists convocations_coach_manage on public.convocations;
create policy convocations_coach_manage on public.convocations for all to authenticated
  using (public.has_staff_role(array['admin']) or exists (
    select 1 from public.matches m join public.players p on p.id = player_id
    where m.id = match_id and p.team_id in (m.home_team_id, m.away_team_id)
      and public.is_team_staff(p.team_id, array['coach', 'coach_adjoint'])
  ))
  with check (public.has_staff_role(array['admin']) or exists (
    select 1 from public.matches m join public.players p on p.id = player_id
    where m.id = match_id and p.team_id in (m.home_team_id, m.away_team_id)
      and public.is_team_staff(p.team_id, array['coach', 'coach_adjoint'])
      and sent_by = auth.uid()
  ));

drop policy if exists notifications_owner_read on public.notifications;
create policy notifications_owner_read on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_staff_insert on public.notifications;
create policy notifications_staff_insert on public.notifications for insert to authenticated
  with check (public.has_staff_role(array['coach', 'coach_adjoint', 'admin']));

-- Editorial permissions: videaste can publish news; admin can supervise.
drop policy if exists news_published_read on public.news;
create policy news_published_read on public.news for select to anon, authenticated
  using (is_published or public.has_staff_role(array['videaste', 'admin']));
drop policy if exists news_editor_manage on public.news;
create policy news_editor_manage on public.news for all to authenticated
  using (public.has_staff_role(array['videaste', 'admin']))
  with check (public.has_staff_role(array['videaste', 'admin']));
drop policy if exists news_media_published_read on public.news_media;
create policy news_media_published_read on public.news_media for select to anon, authenticated
  using (exists (select 1 from public.news n where n.id = news_id and n.is_published) or public.has_staff_role(array['videaste', 'admin']));
drop policy if exists news_media_editor_manage on public.news_media;
create policy news_media_editor_manage on public.news_media for all to authenticated
  using (public.has_staff_role(array['videaste', 'admin']))
  with check (public.has_staff_role(array['videaste', 'admin']));
drop policy if exists mvp_published_read on public.mvp_awards;
create policy mvp_published_read on public.mvp_awards for select to anon, authenticated
  using (published_at is not null or public.has_staff_role(array['videaste', 'admin']));
drop policy if exists mvp_editor_manage on public.mvp_awards;
create policy mvp_editor_manage on public.mvp_awards for all to authenticated
  using (public.has_staff_role(array['videaste', 'admin']))
  with check (public.has_staff_role(array['videaste', 'admin']));

drop policy if exists contact_messages_public_insert on public.contact_messages;
create policy contact_messages_public_insert on public.contact_messages for insert to anon, authenticated with check (true);
drop policy if exists contact_messages_admin_read on public.contact_messages;
create policy contact_messages_admin_read on public.contact_messages for select to authenticated using (public.has_staff_role(array['admin']));
drop policy if exists contact_messages_admin_update on public.contact_messages;
create policy contact_messages_admin_update on public.contact_messages for update to authenticated
  using (public.has_staff_role(array['admin'])) with check (public.has_staff_role(array['admin']));

drop policy if exists stats_import_staff_read on public.stats_import_jobs;
create policy stats_import_staff_read on public.stats_import_jobs for select to authenticated
  using (public.has_staff_role(array['statisticienne', 'admin']) or created_by = auth.uid());
drop policy if exists stats_import_statistician_manage on public.stats_import_jobs;
create policy stats_import_statistician_manage on public.stats_import_jobs for all to authenticated
  using (public.has_staff_role(array['statisticienne', 'admin']))
  with check (public.has_staff_role(array['statisticienne', 'admin']));
drop policy if exists stats_checkpoints_staff_read on public.stats_import_checkpoints;
create policy stats_checkpoints_staff_read on public.stats_import_checkpoints for select to authenticated
  using (public.has_staff_role(array['statisticienne', 'admin']) or exists (select 1 from public.stats_import_jobs j where j.id = job_id and j.created_by = auth.uid()));
drop policy if exists stats_checkpoints_statistician_manage on public.stats_import_checkpoints;
create policy stats_checkpoints_statistician_manage on public.stats_import_checkpoints for all to authenticated
  using (public.has_staff_role(array['statisticienne', 'admin']))
  with check (public.has_staff_role(array['statisticienne', 'admin']));

-- Start from no browser permissions. RLS then limits the rows, while column
-- grants also prevent exposing private identifiers and birth dates.
revoke all on public.roles, public.users, public.teams, public.competitions,
  public.seasons, public.staff, public.players, public.matches,
  public.match_rosters, public.match_lineups, public.match_team_stats,
  public.match_player_stats, public.standings, public.injuries,
  public.suspensions, public.convocations, public.notifications, public.news,
  public.news_media, public.mvp_awards, public.hall_of_fame,
  public.historical_results, public.contact_messages, public.audit_logs,
  public.otp_codes, public.active_sessions, public.stats_import_jobs,
  public.stats_import_checkpoints from public, anon, authenticated;

grant select on public.roles, public.teams, public.competitions, public.seasons,
  public.matches, public.standings, public.historical_results, public.hall_of_fame
  to anon, authenticated;
grant select (id, team_id, first_name, last_name, jersey_number, position, photo_url, status, created_at)
  on public.players to anon, authenticated;
grant insert (team_id, first_name, last_name, jersey_number, position, photo_url, status),
  update (team_id, first_name, last_name, jersey_number, position, photo_url, status), delete
  on public.players to authenticated;
grant select (id, team_id, first_name, last_name, role, created_at) on public.staff to authenticated;
grant insert (user_id, team_id, first_name, last_name, role),
  update (user_id, team_id, first_name, last_name, role), delete on public.staff to authenticated;
grant insert (competition_id, season_id, home_team_id, away_team_id, scheduled_at, location, status, home_score, away_score),
  update (competition_id, season_id, home_team_id, away_team_id, scheduled_at, location, status, home_score, away_score), delete
  on public.matches to authenticated;
grant select (id, match_id, player_id, is_called_up, response, validated_at, validated_by, created_at, updated_at)
  on public.match_rosters to anon, authenticated;
grant insert (match_id, player_id, is_called_up, response, validated_at, validated_by),
  update (is_called_up, response, validated_at, validated_by), delete on public.match_rosters to authenticated;
grant select on public.match_lineups to anon, authenticated;
grant insert (match_id, player_id, is_starter), update (is_starter), delete on public.match_lineups to authenticated;
grant select on public.match_team_stats, public.match_player_stats to anon, authenticated;
grant insert (match_id, team_id, points, rebounds, assists, fg_made, fg_attempted, three_made, three_attempted, ft_made, ft_attempted, published_at, published_by),
  update (points, rebounds, assists, fg_made, fg_attempted, three_made, three_attempted, ft_made, ft_attempted, published_at, published_by), delete
  on public.match_team_stats to authenticated;
grant insert (match_id, player_id, minutes_played, points, rebounds, assists, steals, blocks, turnovers, fg_made, fg_attempted, three_made, three_attempted, ft_made, ft_attempted, plus_minus, evaluation, published_at, published_by),
  update (minutes_played, points, rebounds, assists, steals, blocks, turnovers, fg_made, fg_attempted, three_made, three_attempted, ft_made, ft_attempted, plus_minus, evaluation, published_at, published_by), delete
  on public.match_player_stats to authenticated;
grant insert, update, delete on public.standings to authenticated;
grant select on public.injuries, public.suspensions, public.convocations to authenticated;
grant insert (player_id, description, starts_on, ends_on, is_active, created_by), update (description, starts_on, ends_on, is_active), delete on public.injuries to authenticated;
grant insert (player_id, reason, starts_on, ends_on, is_active, created_by), update (reason, starts_on, ends_on, is_active), delete on public.suspensions to authenticated;
grant insert (match_id, player_id, status, sent_by), update (status), delete on public.convocations to authenticated;
grant select (id, user_id, title, body, href, read_at, created_at), update (read_at) on public.notifications to authenticated;
grant select on public.news, public.news_media, public.mvp_awards to anon, authenticated;
grant insert (title, excerpt, body, category, cover_url, is_published, published_at, author_id), update (title, excerpt, body, category, cover_url, is_published, published_at), delete on public.news to authenticated;
grant insert (news_id, media_url, media_type, caption, sort_order), update (media_url, media_type, caption, sort_order), delete on public.news_media to authenticated;
grant insert (match_id, player_id, headline, published_at, created_by), update (player_id, headline, published_at), delete on public.mvp_awards to authenticated;
grant insert (year, title, description), update (year, title, description), delete on public.hall_of_fame to authenticated;
grant insert (played_on, home_team_name, away_team_name, home_score, away_score, competition_name, season_name), update (played_on, home_team_name, away_team_name, home_score, away_score, competition_name, season_name), delete on public.historical_results to authenticated;
grant insert (pseudo, message) on public.contact_messages to anon, authenticated;
grant select (id, pseudo, message, status, created_at), update (status) on public.contact_messages to authenticated;
grant select, insert, update, delete on public.stats_import_jobs, public.stats_import_checkpoints to authenticated;

-- Audit logs, OTP codes, active sessions and rate limits remain server-only.
commit;
