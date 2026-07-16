-- ============================================================
--  ConsultAdd Tracker – Initial Schema
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'account_manager'
                            CHECK (role IN ('admin', 'account_manager')),
  password_hash TEXT        NOT NULL,
  is_active     BOOLEAN     DEFAULT true,
  must_change_password BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Portals
CREATE TABLE IF NOT EXISTS portals (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL,
  url        TEXT,
  is_active  BOOLEAN     DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES users(id) ON DELETE CASCADE,
  session_id    TEXT        NOT NULL UNIQUE,
  ip_address    TEXT,
  user_agent    TEXT,
  browser       TEXT,
  os            TEXT,
  device        TEXT,
  login_time    TIMESTAMPTZ DEFAULT now(),
  last_activity TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  is_active     BOOLEAN     DEFAULT true
);

-- Login audit logs
CREATE TABLE IF NOT EXISTS login_logs (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        REFERENCES users(id) ON DELETE SET NULL,
  email          TEXT,
  ip_address     TEXT,
  user_agent     TEXT,
  browser        TEXT,
  os             TEXT,
  device         TEXT,
  country        TEXT,
  status         TEXT        NOT NULL CHECK (status IN ('success', 'failed', 'suspicious')),
  failure_reason TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- General audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  actor_name  TEXT,
  action      TEXT        NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Usage analytics (one row per user per day)
CREATE TABLE IF NOT EXISTS usage_analytics (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID    REFERENCES users(id) ON DELETE CASCADE,
  date                DATE    NOT NULL,
  time_spent_minutes  INTEGER DEFAULT 0,
  portal_id           UUID    REFERENCES portals(id) ON DELETE SET NULL,
  login_count         INTEGER DEFAULT 0,
  UNIQUE (user_id, date)
);

-- Add any missing columns to existing tables (safe to re-run)
ALTER TABLE users ADD COLUMN IF NOT EXISTS name          TEXT        NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role          TEXT        NOT NULL DEFAULT 'account_manager';
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT        NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active     BOOLEAN     DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT now();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id  ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_created  ON login_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_user_date     ON usage_analytics(user_id, date);
