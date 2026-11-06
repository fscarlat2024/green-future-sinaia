-- Oferte personalizate din panou. audience: all | member | silver | gold | guest:<id>. kind: stay | bistro | info.
CREATE TABLE offers (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL,
  kind TEXT NOT NULL,
  pct INTEGER NOT NULL DEFAULT 0,
  valid_to TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX offers_active ON offers(active, valid_to);
ALTER TABLE bookings ADD COLUMN offer_id INTEGER;
ALTER TABLE orders ADD COLUMN offer_id INTEGER;
-- telefonul cu oaspetele autentificat, ca oferta sa ajunga la persoana potrivita
ALTER TABLE push_devices ADD COLUMN guest_id INTEGER;
CREATE INDEX push_devices_guest ON push_devices(guest_id);
