-- ============================================================
--  ConsultAdd Tracker – Resumes: allow a Google Drive link instead of a file
-- ============================================================

-- A resume can now be either an uploaded file (file_path/file_name/file_type)
-- or a Google Drive link (google_drive_link), for managers who'd rather share
-- a link than upload the document itself.
ALTER TABLE resumes ALTER COLUMN file_path DROP NOT NULL;
ALTER TABLE resumes ALTER COLUMN file_name DROP NOT NULL;
ALTER TABLE resumes ALTER COLUMN file_type DROP NOT NULL;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS google_drive_link TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resumes_source_check'
  ) THEN
    ALTER TABLE resumes ADD CONSTRAINT resumes_source_check CHECK (
      (file_path IS NOT NULL AND file_name IS NOT NULL AND file_type IS NOT NULL)
      OR google_drive_link IS NOT NULL
    );
  END IF;
END $$;
