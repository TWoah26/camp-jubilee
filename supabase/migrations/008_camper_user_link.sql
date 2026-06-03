-- Link staff camper records back to their user account
alter table campers
  add column if not exists user_id uuid references users(id) on delete set null;

-- Index for fast lookup by user_id (used when promoting a user to staff)
create index if not exists campers_user_id_idx on campers (user_id);
