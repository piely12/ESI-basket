-- Anonymous messages contain no pseudonym or account identifier.
alter table public.contact_messages drop column if exists pseudo;

create table if not exists public.match_reminder_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.match_reminder_deliveries (
  match_id uuid not null references public.matches(id) on delete cascade,
  subscription_id uuid not null references public.match_reminder_subscriptions(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (match_id, subscription_id)
);

alter table public.match_reminder_subscriptions enable row level security;
alter table public.match_reminder_deliveries enable row level security;
revoke all on public.match_reminder_subscriptions from anon, authenticated;
revoke all on public.match_reminder_deliveries from anon, authenticated;
grant all on public.match_reminder_subscriptions to service_role;
grant all on public.match_reminder_deliveries to service_role;

-- Messages are sent only through the server route, which uses the service role.
revoke insert on public.contact_messages from anon, authenticated;
