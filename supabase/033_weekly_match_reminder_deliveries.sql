-- A subscription receives at most one Saturday match summary per date.
create table if not exists public.match_reminder_weekly_deliveries (
  match_date date not null,
  subscription_id uuid not null references public.match_reminder_subscriptions(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (match_date, subscription_id)
);

alter table public.match_reminder_weekly_deliveries enable row level security;
revoke all on public.match_reminder_weekly_deliveries from anon, authenticated;
grant all on public.match_reminder_weekly_deliveries to service_role;
