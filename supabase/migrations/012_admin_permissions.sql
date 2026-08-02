-- ============================================================
--  ConsultAdd Pulse – Scoped admin permissions
--  NULL permissions = unrestricted (full admin, today's behavior).
--  A JSON array of section keys = that admin can only see/use
--  those sections of the Admin Panel.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB;
