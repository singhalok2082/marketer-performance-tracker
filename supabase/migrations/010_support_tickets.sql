-- ============================================================
--  ConsultAdd Pulse – Support ticketing
--  Lets account managers raise issues that admins can see and
--  respond to in-app, instead of over DM/email.
-- ============================================================

CREATE TABLE IF NOT EXISTS tickets (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES users(id) ON DELETE CASCADE,
  subject    TEXT        NOT NULL,
  category   TEXT        NOT NULL DEFAULT 'other',
  status     TEXT        NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT tickets_status_check CHECK (status IN ('open', 'in_progress', 'resolved')),
  CONSTRAINT tickets_category_check CHECK (category IN ('bug', 'access', 'data', 'other'))
);

-- A ticket is a thread: the first message is the original description,
-- every reply (from the reporter or an admin) is another row here.
CREATE TABLE IF NOT EXISTS ticket_messages (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id  UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id   UUID        REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id   UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  message_id  UUID        REFERENCES ticket_messages(id) ON DELETE CASCADE,
  file_path   TEXT        NOT NULL,
  file_name   TEXT,
  file_type   TEXT,
  uploaded_by UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_user_id            ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status              ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id   ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_message_id ON ticket_attachments(message_id);
