-- Gazdele noteaza oaspetii dupa sosire (ca pe Airbnb). Celelalte gazde vad doar mediile si cate gazde l-au notat;
-- nota scrisa ramane privata, o vede doar cine a scris-o.
CREATE TABLE guest_ratings (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER UNIQUE,           -- rezervare facuta pe site
  checkin_id INTEGER UNIQUE,           -- oaspete venit pe Booking/Airbnb, cu check-in online
  property_slug TEXT NOT NULL,
  admin_id INTEGER NOT NULL,           -- gazda care a notat
  guest_name TEXT NOT NULL,
  guest_email TEXT,                    -- litere mici
  guest_phone TEXT,                    -- ultimele 9 cifre
  communication INTEGER NOT NULL,      -- 1..5
  cleanliness INTEGER NOT NULL,        -- 1..5
  rules INTEGER NOT NULL,              -- 1..5
  again INTEGER NOT NULL,              -- 1 = l-ar primi din nou
  note TEXT,                           -- privata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX guest_ratings_email ON guest_ratings(guest_email);
CREATE INDEX guest_ratings_phone ON guest_ratings(guest_phone);
