-- Programari online la piscina si spa, pe intervale orare cu locuri limitate.
-- Programul (ore, durata intervalului, locuri) se tine in site_texts, cheia 'spa_schedule'.
CREATE TABLE IF NOT EXISTS spa_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,
  day TEXT NOT NULL,
  slot TEXT NOT NULL,
  people INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  note TEXT,
  lang TEXT NOT NULL DEFAULT 'ro',
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS spa_bookings_day ON spa_bookings (day, slot, status);
