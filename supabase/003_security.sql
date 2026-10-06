-- Apply in Supabase SQL Editor after 002_auth_helpers.sql.
-- Table de limitation des tentatives (anti-bruteforce), accessible uniquement
-- par le serveur (service_role) : RLS activée, aucune policy.
begin;

create table if not exists public.rate_limits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_rate_limits_key_created on public.rate_limits (key, created_at desc);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated;

-- Nettoyage optionnel des anciennes lignes (à lancer à la main de temps en temps).
create or replace function public.purge_rate_limits() returns void
language sql security definer set search_path = public as $$
  delete from public.rate_limits where created_at < now() - interval '1 day';
$$;
revoke all on function public.purge_rate_limits() from public, anon, authenticated;

commit;
