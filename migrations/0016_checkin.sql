-- Check-in online: poza buletinului celui care rezerva + bifa de regulament.
-- Poza o vede doar proprietarul apartamentului (si administratorul) si se sterge la 30 de zile dupa plecare.
ALTER TABLE properties ADD COLUMN house_rules TEXT;      -- regulamentul apartamentului, scris de proprietar
ALTER TABLE properties ADD COLUMN checkin_key TEXT;      -- cheia din linkul de check-in pentru oaspetii de pe Booking/Airbnb
UPDATE properties SET checkin_key = lower(hex(randomblob(16))) WHERE checkin_key IS NULL;

CREATE TABLE site_texts (
  key TEXT PRIMARY KEY,                -- 'condo_rules' = regulamentul condominiului
  value TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE checkins (
  id INTEGER PRIMARY KEY,
  property_slug TEXT NOT NULL REFERENCES properties(slug),
  booking_code TEXT,                   -- doar la rezervarile facute pe site
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  checkin TEXT NOT NULL,
  checkout TEXT NOT NULL,
  id_photo BLOB NOT NULL,              -- JPEG micsorat in browser
  condo_rules_ok INTEGER NOT NULL DEFAULT 0,
  house_rules_ok INTEGER NOT NULL DEFAULT 0,
  lang TEXT NOT NULL DEFAULT 'ro',
  created_at INTEGER NOT NULL,
  seen_at INTEGER,
  delete_after TEXT NOT NULL           -- data plecarii + 30 de zile
);
CREATE INDEX checkins_prop ON checkins(property_slug, created_at);
CREATE INDEX checkins_delete ON checkins(delete_after);
