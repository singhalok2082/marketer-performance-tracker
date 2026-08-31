-- ============================================================
--  ConsultAdd Pulse – Candidate Bench: system/login credentials
--  Separate from a candidate's personal/marketing details — the
--  logins (Jump, client interview systems, etc.) a candidate uses,
--  which account managers need to actually use and share (e.g. on
--  Slack) but only an admin should be able to add or correct.
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_system_credentials (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id  UUID        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  system_name   TEXT        NOT NULL,
  login_id      TEXT,
  password      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_system_credentials_candidate_id ON candidate_system_credentials(candidate_id);
