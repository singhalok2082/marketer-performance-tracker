-- ============================================================
--  ConsultAdd Pulse – Daily Tasks (lead uploads + assignment)
--  Admin uploads a CSV of leads (with flexible, per-sheet column
--  mapping), assigns a count of fresh leads per account manager
--  per day, and those managers work the list — one call/email
--  checklist per lead, tracked until done.
-- ============================================================

-- One row per CSV file uploaded. Holds the raw parsed rows and the
-- admin-confirmed header -> field mapping, so an upload can be
-- reviewed/adjusted before it's committed into the `leads` pool.
CREATE TABLE IF NOT EXISTS lead_uploads (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
  file_name       TEXT,
  headers         JSONB       NOT NULL,
  rows            JSONB       NOT NULL,
  row_count       INTEGER     NOT NULL DEFAULT 0,
  mapping         JSONB,
  custom_fields   JSONB       DEFAULT '[]',
  status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'committed')),
  imported_count  INTEGER,
  skipped_count   INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now(),
  committed_at    TIMESTAMPTZ
);

-- The lead pool itself. Canonical fields cover the common CSV
-- columns; anything else the admin mapped as a custom variable for
-- that sheet lands in custom_fields.
CREATE TABLE IF NOT EXISTS leads (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id       UUID        REFERENCES lead_uploads(id) ON DELETE SET NULL,
  full_name       TEXT        NOT NULL,
  designation     TEXT,
  company_name    TEXT,
  company_domain  TEXT,
  linkedin_url    TEXT,
  email           TEXT,
  phone           TEXT,
  custom_fields   JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- A lead is assigned to exactly one account manager, ever — once
-- handed out it stays theirs until they complete it (UNIQUE lead_id),
-- so the admin's next batch only ever pulls from never-assigned leads.
CREATE TABLE IF NOT EXISTS lead_assignments (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id           UUID        NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
  assignment_date   DATE        NOT NULL DEFAULT current_date,
  call_done         BOOLEAN     DEFAULT false,
  email_done        BOOLEAN     DEFAULT false,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_upload_id            ON leads(upload_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_user_id    ON lead_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_date       ON lead_assignments(assignment_date DESC);
