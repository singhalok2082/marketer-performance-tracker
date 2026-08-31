-- ============================================================
--  ConsultAdd Pulse – Candidate Bench: fix system access hierarchy
--  The earlier model treated "Jump" and a candidate's individual
--  systems as flat, equal peers — wrong. Jump is a single parent
--  login (one email + password) that gets you in; once inside,
--  there can be multiple candidate systems, each found by its own
--  System Name + Username, with its own password. Jump moves onto
--  candidates itself (one per candidate); candidate_system_credentials
--  keeps just the per-system rows, with login_id renamed to username
--  to match how they're actually looked up.
-- ============================================================

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS jump_login_id TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS jump_password TEXT;

ALTER TABLE candidate_system_credentials RENAME COLUMN login_id TO username;

-- Move any existing "Jump" row from the old flat model into the new
-- candidate-level columns, then drop it from the systems list — it was
-- never a candidate system, it's the parent login.
UPDATE candidates c
SET jump_login_id = s.username, jump_password = s.password
FROM candidate_system_credentials s
WHERE s.candidate_id = c.id AND lower(s.system_name) = 'jump';

DELETE FROM candidate_system_credentials WHERE lower(system_name) = 'jump';
