-- ============================================================
--  ConsultAdd Tracker – Emails & Phone Numbers asset tracking
-- ============================================================

-- Email addresses used to create job-portal profiles
CREATE TABLE IF NOT EXISTS emails (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES users(id) ON DELETE CASCADE,
  email_address TEXT        NOT NULL,
  resume_id     UUID        REFERENCES resumes(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Many-to-many: which portals a given email is used on
CREATE TABLE IF NOT EXISTS email_portals (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id  UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  portal_id INTEGER NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  UNIQUE (email_id, portal_id)
);

-- Phone numbers: "Use of the phone number on different portals"
CREATE TABLE IF NOT EXISTS phone_portal_usage (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES users(id) ON DELETE CASCADE,
  phone_number  TEXT        NOT NULL,
  resume_id     UUID        REFERENCES resumes(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phone_portal_usage_portals (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_portal_usage_id UUID NOT NULL REFERENCES phone_portal_usage(id) ON DELETE CASCADE,
  portal_id             INTEGER NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  UNIQUE (phone_portal_usage_id, portal_id)
);

-- Phone numbers: "Submission of the phone number on prime vendors"
CREATE TABLE IF NOT EXISTS phone_vendor_calls (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        REFERENCES users(id) ON DELETE CASCADE,
  phone_number   TEXT        NOT NULL,
  vendor_name    TEXT        NOT NULL,
  candidate_name TEXT        NOT NULL,
  resume_id      UUID        REFERENCES resumes(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_emails_user_id              ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_resume_id            ON emails(resume_id);
CREATE INDEX IF NOT EXISTS idx_email_portals_email_id      ON email_portals(email_id);
CREATE INDEX IF NOT EXISTS idx_email_portals_portal_id     ON email_portals(portal_id);
CREATE INDEX IF NOT EXISTS idx_phone_portal_usage_user_id   ON phone_portal_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_portal_usage_resume_id ON phone_portal_usage(resume_id);
CREATE INDEX IF NOT EXISTS idx_ppu_portals_usage_id         ON phone_portal_usage_portals(phone_portal_usage_id);
CREATE INDEX IF NOT EXISTS idx_ppu_portals_portal_id        ON phone_portal_usage_portals(portal_id);
CREATE INDEX IF NOT EXISTS idx_phone_vendor_calls_user_id   ON phone_vendor_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_vendor_calls_resume_id ON phone_vendor_calls(resume_id);
