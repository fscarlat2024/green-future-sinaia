-- Telefoanele cu aplicatia. admin_id e completat cat timp un proprietar sau administrator e logat in panou pe acel telefon.
CREATE TABLE push_devices (
  token TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'ro',
  admin_id INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX push_devices_admin ON push_devices(admin_id);
ALTER TABLE bookings ADD COLUMN push_token TEXT;
ALTER TABLE orders ADD COLUMN push_token TEXT;
