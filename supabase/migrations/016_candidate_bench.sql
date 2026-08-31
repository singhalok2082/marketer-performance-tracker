-- ============================================================
--  ConsultAdd Pulse – Candidate Bench
--  Candidates available to market to clients (W2 and/or C2C).
--  New submissions from account managers stay invisible to other
--  managers until an admin approves them; once approved, only an
--  admin can edit directly — managers instead file an edit request
--  (candidate_edit_requests) that only takes effect on admin approval.
--  Offers are logged over time; marketing_status controls whether a
--  candidate still shows in the active bench (never a hard delete).
-- ============================================================

CREATE TABLE IF NOT EXISTS candidates (
  id                        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- identity
  marketing_name            TEXT        NOT NULL,
  legal_name                TEXT,
  date_of_birth             DATE,
  ssn_last4                 TEXT        CHECK (ssn_last4 IS NULL OR ssn_last4 ~ '^[0-9]{4}$'),

  -- visa / immigration
  visa_type                 TEXT,
  visa_start_date           DATE,
  visa_end_date             DATE,
  us_entry_date             DATE,

  -- address, explicitly labeled per its real-world source
  current_address_linkedin  TEXT,

  -- segments — a candidate can be marketed as W2, C2C, or both, never neither
  is_w2                     BOOLEAN     NOT NULL DEFAULT false,
  is_c2c                    BOOLEAN     NOT NULL DEFAULT false,

  -- marketing lifecycle (never deleted, only filtered out of the active view)
  marketing_status          TEXT        NOT NULL DEFAULT 'active',

  -- submission / approval workflow
  approval_status           TEXT        NOT NULL DEFAULT 'pending',
  submitted_by              UUID        REFERENCES users(id) ON DELETE SET NULL,
  approved_by               UUID        REFERENCES users(id) ON DELETE SET NULL,
  approved_at               TIMESTAMPTZ,
  rejection_reason          TEXT,

  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT candidates_marketing_name_check CHECK (btrim(marketing_name) <> ''),
  CONSTRAINT candidates_segment_check        CHECK (is_w2 OR is_c2c),
  CONSTRAINT candidates_marketing_status_check CHECK (marketing_status IN ('active', 'stopped')),
  CONSTRAINT candidates_approval_status_check  CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

-- One row per degree — a candidate can list multiple.
CREATE TABLE IF NOT EXISTS candidate_education (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id  UUID        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  degree_name   TEXT,
  institution   TEXT,
  location      TEXT,
  start_year    INTEGER,
  end_year      INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Freeform label/value pairs an admin or manager wants attached to a
-- candidate with no fixed schema (certifications, notes, etc).
CREATE TABLE IF NOT EXISTS candidate_details (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id  UUID        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  label         TEXT        NOT NULL,
  value         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- A candidate can receive multiple offers over time; admin decides after
-- each one whether to keep marketing them (marketing_status stays 'active')
-- or stop (marketing_status -> 'stopped').
CREATE TABLE IF NOT EXISTS candidate_offers (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id    UUID        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  employer_client TEXT        NOT NULL,
  offer_date      DATE,
  notes           TEXT,
  created_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Proposed changes to an already-approved candidate. Nothing here is live
-- until an admin approves it; `changes` holds only the fields being
-- proposed (partial candidate columns, plus optional full-replacement
-- education/details arrays), applied atomically on approval.
CREATE TABLE IF NOT EXISTS candidate_edit_requests (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id      UUID        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  requested_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  changes           JSONB       NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending',
  reviewed_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT candidate_edit_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_candidates_approval_status   ON candidates(approval_status);
CREATE INDEX IF NOT EXISTS idx_candidates_marketing_status  ON candidates(marketing_status);
CREATE INDEX IF NOT EXISTS idx_candidates_submitted_by      ON candidates(submitted_by);
CREATE INDEX IF NOT EXISTS idx_candidate_education_candidate_id ON candidate_education(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_details_candidate_id   ON candidate_details(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_offers_candidate_id    ON candidate_offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_edit_requests_candidate_id ON candidate_edit_requests(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_edit_requests_status      ON candidate_edit_requests(status);
