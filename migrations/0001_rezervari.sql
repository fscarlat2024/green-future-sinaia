-- Rezervari directe Green Future Sinaia. Datele sunt text YYYY-MM-DD; intervalele sunt [from, to).
CREATE TABLE properties (
  slug TEXT PRIMARY KEY,               -- acelasi nume ca fisierul din src/apartments
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,   -- 0 = pe site apare doar contactul, fara formular
  capacity INTEGER NOT NULL DEFAULT 2,
  base_price INTEGER,                  -- lei / noapte; fara pret apartamentul nu se poate rezerva
  cleaning_fee INTEGER NOT NULL DEFAULT 0,
  min_nights INTEGER NOT NULL DEFAULT 1,
  instant_book INTEGER NOT NULL DEFAULT 0, -- 0 = proprietarul confirma, 1 = confirmare pe loc
  free_cancel_days INTEGER NOT NULL DEFAULT 7,
  checkin_time TEXT NOT NULL DEFAULT '15:00',
  checkout_time TEXT NOT NULL DEFAULT '11:00',
  owner_email TEXT,
  owner_phone TEXT,
  ical_import_url TEXT,                -- calendarul Booking.com / Airbnb
  ical_token TEXT NOT NULL,            -- link secret pentru calendarul exportat
  ical_synced_at INTEGER,
  ical_error TEXT
);

CREATE TABLE rates (
  id INTEGER PRIMARY KEY,
  property_slug TEXT NOT NULL REFERENCES properties(slug),
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL,
  price INTEGER NOT NULL,
  min_nights INTEGER,
  label TEXT
);
CREATE INDEX rates_prop ON rates(property_slug, date_from);

CREATE TABLE blocks (
  id INTEGER PRIMARY KEY,
  property_slug TEXT NOT NULL REFERENCES properties(slug),
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual', -- manual | ical
  note TEXT
);
CREATE INDEX blocks_prop ON blocks(property_slug, date_from);

CREATE TABLE bookings (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,            -- linkul de gestionare primit de oaspete
  property_slug TEXT NOT NULL REFERENCES properties(slug),
  checkin TEXT NOT NULL,
  checkout TEXT NOT NULL,
  adults INTEGER NOT NULL,
  children INTEGER NOT NULL DEFAULT 0,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  note TEXT,
  lang TEXT NOT NULL DEFAULT 'ro',
  subtotal INTEGER NOT NULL,
  cleaning_fee INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL,                -- pending | confirmed | declined | cancelled | expired
  conflict_notified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX bookings_prop ON bookings(property_slug, status, checkin);

CREATE TABLE admins (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner'   -- admin = toate apartamentele, owner = doar ale lui
);
CREATE TABLE admin_properties (
  admin_id INTEGER NOT NULL REFERENCES admins(id),
  property_slug TEXT NOT NULL REFERENCES properties(slug),
  PRIMARY KEY (admin_id, property_slug)
);
CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id),
  expires_at INTEGER NOT NULL
);
CREATE TABLE login_fails (email TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, window_start INTEGER NOT NULL);

INSERT INTO properties (slug, name, capacity, min_nights, ical_token)
VALUES ('studio-dandelion', 'Studio Dandelion', 4, 2, lower(hex(randomblob(20))));
