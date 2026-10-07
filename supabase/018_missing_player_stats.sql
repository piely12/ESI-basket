-- Add statistics present in the official spreadsheet and absent from
-- match_player_stats. Historical values stay NULL because the old sheets do
-- not let us recover the split or foul counts accurately.
-- Apply after migrations 001 through 017.
begin;

alter table public.match_player_stats
  add column if not exists personal_fouls integer,
  add column if not exists rebounds_defensive integer,
  add column if not exists rebounds_offensive integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.match_player_stats'::regclass
      and conname = 'match_player_stats_new_counts_nonnegative'
  ) then
    alter table public.match_player_stats
      add constraint match_player_stats_new_counts_nonnegative
      check (
        (personal_fouls is null or personal_fouls between 0 and 5)
        and (rebounds_defensive is null or rebounds_defensive >= 0)
        and (rebounds_offensive is null or rebounds_offensive >= 0)
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.match_player_stats'::regclass
      and conname = 'match_player_stats_rebound_split_consistent'
  ) then
    alter table public.match_player_stats
      add constraint match_player_stats_rebound_split_consistent
      check (
        (rebounds_defensive is null and rebounds_offensive is null)
        or (
          rebounds_defensive is not null and rebounds_offensive is not null
          and rebounds = rebounds_defensive + rebounds_offensive
        )
      );
  end if;
end;
$$;

-- Public queries can read these values only when their existing published_at
-- RLS policy admits the row. The import server action writes via service_role.
grant select (personal_fouls, rebounds_defensive, rebounds_offensive)
  on public.match_player_stats to anon, authenticated;

comment on column public.match_player_stats.personal_fouls is
  'Individual fouls from the official score sheet; NULL means unavailable in historical source data.';
comment on column public.match_player_stats.rebounds_defensive is
  'Defensive rebounds; NULL means historical source did not split rebounds.';
comment on column public.match_player_stats.rebounds_offensive is
  'Offensive rebounds; NULL means historical source did not split rebounds.';

commit;
