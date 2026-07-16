-- ============================================================
--  ConsultAdd Tracker – LinkedIn / Resume / Job Application Tracking
-- ============================================================

-- LinkedIn profiles created by account managers
CREATE TABLE IF NOT EXISTS linkedin_profiles (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES users(id) ON DELETE CASCADE,
  linkedin_url  TEXT        NOT NULL,
  title         TEXT        NOT NULL,
  location      TEXT,
  connections   INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Resumes (current + historical), backed by a file in Supabase Storage
CREATE TABLE IF NOT EXISTS resumes (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  file_path     TEXT        NOT NULL,
  file_name     TEXT        NOT NULL,
  file_type     TEXT        NOT NULL CHECK (file_type IN ('pdf', 'doc', 'docx')),
  is_active     BOOLEAN     DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Daily job applications submitted on external portals
CREATE TABLE IF NOT EXISTS job_applications (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        REFERENCES users(id) ON DELETE CASCADE,
  portal_id        INTEGER     REFERENCES portals(id) ON DELETE SET NULL,
  job_url          TEXT,
  job_title        TEXT        NOT NULL,
  candidate_info   TEXT,
  job_description  TEXT,
  resume_id        UUID        REFERENCES resumes(id) ON DELETE SET NULL,
  applied_date     DATE        NOT NULL DEFAULT current_date,
  status           TEXT        NOT NULL DEFAULT 'Applied'
                              CHECK (status IN ('Applied', 'Submitted to Client', 'Interview Scheduled', 'Offer', 'Rejected', 'No Response')),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_linkedin_user_id       ON linkedin_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id        ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_is_active      ON resumes(is_active);
CREATE INDEX IF NOT EXISTS idx_applications_user_id   ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_date      ON job_applications(applied_date DESC);
CREATE INDEX IF NOT EXISTS idx_applications_portal_id ON job_applications(portal_id);
