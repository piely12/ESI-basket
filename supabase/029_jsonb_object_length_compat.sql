-- Compatibility shim for the already-installed 027 workflow functions.
-- Fresh installs use jsonb_object_keys counts directly in migration 027.
-- Apply after migrations 001 through 028.
begin;

create or replace function public.jsonb_object_length(p_object jsonb)
returns integer
language sql
immutable
strict
set search_path = pg_catalog, pg_temp
as $$
  select count(*)::integer from jsonb_object_keys(p_object);
$$;
revoke all on function public.jsonb_object_length(jsonb) from public, anon, authenticated;
comment on function public.jsonb_object_length(jsonb) is
  'Compatibility helper for existing match composition workflow functions; counts object keys.';

commit;
