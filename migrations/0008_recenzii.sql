-- Recenzii dupa sejur. Linkul din email e legat de o singura rezervare confirmata.
ALTER TABLE bookings ADD COLUMN review_token_hash TEXT;
ALTER TABLE bookings ADD COLUMN review_sent_at INTEGER;
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id),
  property_slug TEXT NOT NULL REFERENCES properties(slug),
  score INTEGER NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'ro',
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX reviews_property ON reviews(property_slug, hidden, created_at);
CREATE INDEX bookings_review ON bookings(status, review_sent_at, checkout);
