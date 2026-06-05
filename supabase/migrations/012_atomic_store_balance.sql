-- Atomic store balance increment to prevent race conditions
-- when multiple payments arrive simultaneously for the same camper.
-- Uses a Postgres UPDATE (not read-modify-write in JS) so it's safe
-- under concurrent requests.

CREATE OR REPLACE FUNCTION add_store_balance(p_camper_id uuid, p_amount numeric)
RETURNS void AS $$
  UPDATE campers
  SET store_balance = ROUND(store_balance + p_amount, 2)
  WHERE id = p_camper_id;
$$ LANGUAGE sql SECURITY DEFINER;
