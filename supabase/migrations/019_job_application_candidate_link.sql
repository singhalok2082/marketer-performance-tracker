-- ============================================================
--  ConsultAdd Pulse – Link job applications to Candidate Bench
--  job_applications.candidate_info has always been freeform text
--  ("Name / notes"), so there's no reliable way to see, from a bench
--  candidate's profile, which applications/interviews/offers are
--  actually theirs. This adds an optional structured link so account
--  managers can tag an application with the bench candidate it's for,
--  and Candidate Bench can show that activity on the candidate's page.
-- ============================================================

ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_job_applications_candidate_id ON job_applications(candidate_id);
