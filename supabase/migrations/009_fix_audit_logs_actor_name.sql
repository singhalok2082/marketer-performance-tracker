-- ============================================================
--  Fix: live `audit_logs` table is missing `actor_name`
--
--  001_schema.sql doesn't even declare this column, but every route
--  in the app (linkedin.js, resumes.js, emails.js, phoneNumbers.js,
--  etc.) has always inserted one alongside actor_id, expecting to
--  keep a human-readable name next to each log entry without a join
--  back to `users`. Discovered while verifying the new Emails/Phone
--  Numbers routes: every audit_logs insert across the entire app has
--  been silently failing with "Could not find the 'actor_name' column
--  of 'audit_logs' in the schema cache" (PGRST204) — none of these
--  inserts check their error, so no route has ever actually recorded
--  an audit trail entry.
--
--  Same class of schema drift as 003_fix_users_must_change_password.sql.
-- ============================================================

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_name TEXT;
