-- ============================================================
--  ConsultAdd Pulse – LinkedIn profile creation date
--  Lets account managers record when the LinkedIn account itself
--  was created, separate from when it was logged into the tracker.
-- ============================================================

ALTER TABLE linkedin_profiles ADD COLUMN IF NOT EXISTS profile_created_date DATE;
