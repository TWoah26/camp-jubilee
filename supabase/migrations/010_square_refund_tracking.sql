-- Track whether Square auto-processed the refund so directors don't pay twice
alter table session_balance_choices
  add column if not exists square_refund_id text,
  add column if not exists square_refund_status text; -- 'completed', 'failed', 'pending'
