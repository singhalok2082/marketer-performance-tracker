-- ============================================================
--  ConsultAdd Pulse – Anonymous landing-page visit tracking
--  Lets admins see how much traffic the public landing page gets
--  and roughly where it's coming from, before anyone logs in.
-- ============================================================

CREATE TABLE IF NOT EXISTS page_visits (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  path       TEXT        NOT NULL DEFAULT '/',
  ip_address TEXT,
  country    TEXT,
  city       TEXT,
  referrer   TEXT,
  browser    TEXT,
  os         TEXT,
  device     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_page_visits_ip_address  ON page_visits(ip_address);
