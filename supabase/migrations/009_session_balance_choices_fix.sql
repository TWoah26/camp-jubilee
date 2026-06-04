-- Add missing donate/refund split columns to session_balance_choices
alter table session_balance_choices
  add column if not exists donate_amount numeric(10,2) not null default 0,
  add column if not exists refund_amount numeric(10,2) not null default 0;

-- Expand the choice constraint to allow 'split' (part donate, part refund)
alter table session_balance_choices
  drop constraint if exists session_balance_choices_choice_check;

alter table session_balance_choices
  add constraint session_balance_choices_choice_check
  check (choice in ('refund', 'donate', 'split'));
