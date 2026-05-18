alter table users
  add column if not exists notifications_last_seen_at timestamptz;
