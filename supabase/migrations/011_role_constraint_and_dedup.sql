-- 1. Fix users.role CHECK constraint — add all roles used in the app
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('director', 'administrator', 'staff', 'nurse', 'media', 'store', 'parent'));

-- 2. Update is_director() to include administrator so all RLS policies
--    that call is_director() work correctly for administrator accounts
CREATE OR REPLACE FUNCTION is_director()
RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('director', 'administrator')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Prevent duplicate session_balance_choices rows (double-submit protection)
ALTER TABLE session_balance_choices
  DROP CONSTRAINT IF EXISTS session_balance_choices_camper_session_unique;
ALTER TABLE session_balance_choices
  ADD CONSTRAINT session_balance_choices_camper_session_unique
  UNIQUE (camper_id, session_id);
