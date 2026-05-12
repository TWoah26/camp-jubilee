-- Add extended fields to campers table for CSV import
alter table campers
  add column if not exists grade text,
  add column if not exists shirt_size text,
  add column if not exists dietary_restrictions text,
  add column if not exists medications text,
  add column if not exists tuition_commitment numeric(10,2) not null default 0,
  add column if not exists tuition_paid numeric(10,2) not null default 0,
  add column if not exists is_staff boolean not null default false;
