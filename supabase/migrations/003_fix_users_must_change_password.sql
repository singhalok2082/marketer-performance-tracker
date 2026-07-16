-- ============================================================
--  Fix: live `users` table is missing `must_change_password`
--
--  001_schema.sql already declares this column, but it was never
--  actually applied to this project's `users` table (discovered when
--  admin's "Manage team & portals -> Add" flow started 500ing with
--  "Could not find the 'must_change_password' column").
--
--  Backfilled to FALSE (not TRUE) for existing rows so none of the
--  current 28 seeded accounts get unexpectedly forced into the
--  "set a new password" screen on their next login — until now that
--  screen has never actually triggered for them because this column
--  didn't exist. New account managers created going forward still get
--  must_change_password = true explicitly from routes/users.js's
--  insert, so the "set password on first login" behavior now works
--  correctly for new hires without disrupting existing ones.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
