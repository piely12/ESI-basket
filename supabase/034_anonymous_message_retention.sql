-- Speeds up the daily server-side deletion of messages older than 12 months.
create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at);
