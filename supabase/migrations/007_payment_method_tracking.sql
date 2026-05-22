-- Add missing columns to store_transactions (code already references these)
alter table store_transactions
  add column if not exists payment_method text not null default 'square',
  add column if not exists square_order_id text;

-- Add missing columns to tuition_payments (code already references these)
alter table tuition_payments
  add column if not exists payment_method text,
  add column if not exists session_id uuid references sessions(id),
  add column if not exists notes text;

-- Track processed refunds at end of session
create table if not exists refund_records (
  id uuid primary key default uuid_generate_v4(),
  camper_id uuid references campers(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  amount numeric(10,2) not null,
  method text not null check (method in ('card', 'cash', 'check', 'donated')),
  processed_by uuid references users(id),
  processed_at timestamptz not null default now(),
  notes text,
  unique(camper_id, session_id)
);

alter table refund_records enable row level security;

create policy "refund_records_admin" on refund_records
  for all using (
    exists (select 1 from users where id = auth.uid() and role in ('director','administrator'))
  );
