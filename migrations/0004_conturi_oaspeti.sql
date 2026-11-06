-- Conturi de oaspeti si nivelele Green Future Club. Nivelul nu se stocheaza: se calculeaza din sejururi si comenzi,
-- level_override il seteaza administratorul pentru oferte. Reducerea ramane fixata pe rezervarea sau comanda facuta.
CREATE TABLE guests (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'ro',
  level_override TEXT,                 -- member | silver | gold; gol = automat
  created_at INTEGER NOT NULL
);
CREATE TABLE guest_sessions (
  token_hash TEXT PRIMARY KEY,
  guest_id INTEGER NOT NULL REFERENCES guests(id),
  expires_at INTEGER NOT NULL
);
CREATE TABLE guest_resets (
  token_hash TEXT PRIMARY KEY,
  guest_id INTEGER NOT NULL REFERENCES guests(id),
  expires_at INTEGER NOT NULL
);
ALTER TABLE bookings ADD COLUMN guest_id INTEGER;
ALTER TABLE bookings ADD COLUMN discount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN guest_id INTEGER;
ALTER TABLE orders ADD COLUMN discount INTEGER NOT NULL DEFAULT 0;
-- proprietarul alege daca apartamentul lui acorda reducerile
ALTER TABLE properties ADD COLUMN loyalty_enabled INTEGER NOT NULL DEFAULT 0;
CREATE INDEX bookings_guest ON bookings(guest_id);
CREATE INDEX orders_guest ON orders(guest_id);
