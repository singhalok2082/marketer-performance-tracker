-- ============================================================
--  ConsultAdd Tracker – Recruiting Activity (outreach, vendor
--  activities, daily notes) — brings the app in line with the
--  team's Excel tracker, minus the old Bharat/Ankit team grouping.
-- ============================================================

-- Inbound leads: a recruiter reaches out about a candidate
CREATE TABLE IF NOT EXISTS recruiter_outreach (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        REFERENCES users(id) ON DELETE CASCADE,
  channel          TEXT        CHECK (channel IN ('LinkedIn', 'Email', 'Both')),
  employment_type  TEXT        CHECK (employment_type IN ('C2C', 'W2', 'Full Time')),
  vendor_company   TEXT,
  job_role         TEXT,
  contacted_date   DATE        NOT NULL DEFAULT current_date,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Cold emails / vendor calls / tech screenings / interviews / offers —
-- one table, distinguished by activity_type; each type only populates
-- the fields relevant to it.
CREATE TABLE IF NOT EXISTS vendor_activities (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID        REFERENCES users(id) ON DELETE CASCADE,
  activity_type        TEXT        NOT NULL CHECK (activity_type IN ('cold_email', 'vendor_call', 'tech_screening', 'interview', 'offer')),
  vendor_name          TEXT,
  vendor_company       TEXT,
  client_name          TEXT,
  candidate_name       TEXT,
  employment_type      TEXT        CHECK (employment_type IN ('C2C', 'W2')),
  job_title            TEXT,
  jd_text              TEXT,
  rate_usd             NUMERIC,
  duration_minutes     INTEGER,
  activity_date        DATE        NOT NULL DEFAULT current_date,
  notes                TEXT,
  application_id       UUID        REFERENCES job_applications(id) ON DELETE SET NULL,
  imported_placeholder BOOLEAN     DEFAULT false,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- One "what's blocking me today" note per account manager per day
CREATE TABLE IF NOT EXISTS daily_notes (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        REFERENCES users(id) ON DELETE CASCADE,
  note_date      DATE        NOT NULL DEFAULT current_date,
  challenge_text TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, note_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outreach_user_id       ON recruiter_outreach(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_date          ON recruiter_outreach(contacted_date DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_act_user_id     ON vendor_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_act_type        ON vendor_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_vendor_act_date        ON vendor_activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_notes_user_id    ON daily_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_notes_date       ON daily_notes(note_date DESC);
