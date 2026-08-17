-- ============================================================
--  ConsultAdd Pulse – Daily Tasks: track lead assignment directly
--  The "fresh leads" pool query used to build a NOT IN (...) list of
--  every already-assigned lead ID, which works fine at small scale
--  but breaks the outgoing request once there are hundreds of
--  assignments (the list becomes too long for the request to Supabase
--  to even go out). A denormalized flag makes that query a plain
--  indexed equality check instead.
-- ============================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_assigned BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_leads_is_assigned ON leads(is_assigned) WHERE is_assigned = false;

UPDATE leads SET is_assigned = true WHERE id IN (SELECT lead_id FROM lead_assignments) AND is_assigned = false;
