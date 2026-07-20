-- ============================================================
--  ConsultAdd Tracker – Job Descriptions + Resume tech stack + Portal list
-- ============================================================

-- Daily job-description activity: creating/updating/enhancing a JD for a role
CREATE TABLE IF NOT EXISTS job_descriptions (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES users(id) ON DELETE CASCADE,
  designation   TEXT        NOT NULL,
  location      TEXT,
  action        TEXT        NOT NULL DEFAULT 'Created'
                            CHECK (action IN ('Created', 'Updated', 'Enhanced')),
  jd_date       DATE        NOT NULL DEFAULT current_date,
  jd_text       TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jd_user_id ON job_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_jd_date    ON job_descriptions(jd_date DESC);

-- Resumes need a tech stack tag alongside the existing title, so daily
-- resume creation can be broken down by stack (e.g. "Java", "DevOps").
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS tech_stack TEXT;

-- portals.name needs a uniqueness guarantee for the upsert-by-name seeding
-- pattern already used in supabase/seed.js and this migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'portals_name_key'
  ) THEN
    ALTER TABLE portals ADD CONSTRAINT portals_name_key UNIQUE (name);
  END IF;
END $$;

-- Replace the placeholder India-market portal list with the US job boards
-- this team actually uses; old rows are soft-deactivated, not deleted, so
-- any historical applications against them stay intact.
INSERT INTO portals (name, url) VALUES
  ('LinkedIn',      'https://linkedin.com'),
  ('Dice',          'https://dice.com'),
  ('Monster',       'https://monster.com'),
  ('Indeed',        'https://indeed.com'),
  ('ZipRecruiter',  'https://ziprecruiter.com'),
  ('CareerBuilder', 'https://careerbuilder.com')
ON CONFLICT (name) DO NOTHING;

UPDATE portals SET is_active = false WHERE name IN ('Naukri', 'Internshala');
