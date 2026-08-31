-- ============================================================
--  ConsultAdd Pulse – Candidate Bench: nothing is compulsory
--  Recruiting sends partial info in whatever order it arrives; admin
--  pastes what they have and fills gaps later. Drop every hard
--  requirement so a candidate/detail/system-credential row can be
--  saved with only some fields known. Also adds a freeform notes
--  field on system credentials for whatever extra info doesn't fit
--  system_name/login_id/password (2FA, security questions, etc).
-- ============================================================

ALTER TABLE candidates ALTER COLUMN marketing_name DROP NOT NULL;
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_marketing_name_check;
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_segment_check;

ALTER TABLE candidate_details ALTER COLUMN label DROP NOT NULL;

ALTER TABLE candidate_system_credentials ALTER COLUMN system_name DROP NOT NULL;
ALTER TABLE candidate_system_credentials ADD COLUMN IF NOT EXISTS notes TEXT;
