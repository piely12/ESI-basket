-- Apply in Supabase SQL Editor after 003_security.sql.
-- Ajoute des colonnes dédiées à audit_logs pour pouvoir filtrer/chercher
-- directement par IP ou par appareil, sans fouiller dans metadata (jsonb).
begin;

alter table public.audit_logs
  add column if not exists ip_address inet,
  add column if not exists user_agent text;

create index if not exists idx_audit_logs_ip on public.audit_logs (ip_address);
create index if not exists idx_audit_logs_actor on public.audit_logs (actor_user_id, created_at desc);

commit;
