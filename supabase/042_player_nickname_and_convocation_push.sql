-- Comptes joueurs : pseudo personnel et notifications push de convocation.
-- Apply after migrations 001 through 041.
begin;

-- 1. Pseudo choisi par chaque compte (affiché seulement à son propriétaire).
alter table public.users add column if not exists nickname text;
alter table public.users drop constraint if exists users_nickname_length;
alter table public.users add constraint users_nickname_length
  check (nickname is null or char_length(nickname) between 2 and 20);

-- 2. Un appareil abonné aux notifications peut appartenir à un compte :
--    les convocations ne sont envoyées qu'aux appareils du joueur concerné.
alter table public.match_reminder_subscriptions
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists match_reminder_subscriptions_user_idx
  on public.match_reminder_subscriptions (user_id) where user_id is not null;

-- 3. Une convocation n'est envoyée en push qu'une seule fois.
alter table public.match_composition_notifications
  add column if not exists pushed_at timestamptz;
-- Les convocations déjà publiées ne sont pas renvoyées en push.
update public.match_composition_notifications set pushed_at = coalesce(sent_at, now())
where pushed_at is null;

commit;
