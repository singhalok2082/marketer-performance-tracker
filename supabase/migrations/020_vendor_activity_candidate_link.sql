-- ============================================================
--  ConsultAdd Pulse – Link vendor activities to Candidate Bench
--  vendor_activities is where account managers actually log
--  tech_screening/interview/offer activity per candidate (via a
--  freeform candidate_name column) — this is the real source for
--  "how many interviews/offers has this candidate had", more so
--  than job_applications. Same optional-link approach as 019.
-- ============================================================

ALTER TABLE vendor_activities ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_activities_candidate_id ON vendor_activities(candidate_id);
