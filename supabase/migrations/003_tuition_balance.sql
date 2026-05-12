-- Ensure tuition tracking columns exist on campers
alter table campers
  add column if not exists tuition_commitment numeric(10,2) not null default 0,
  add column if not exists tuition_paid numeric(10,2) not null default 0;
