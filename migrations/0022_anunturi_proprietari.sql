-- Anunturi in aplicatie catre proprietari, puse din baza de date; worker-ul le trimite o singura data.
CREATE TABLE owner_notices (
  id INTEGER PRIMARY KEY,
  audience TEXT NOT NULL DEFAULT 'owners_new',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  created_at INTEGER NOT NULL,
  sent_at INTEGER,
  sent INTEGER,
  failed INTEGER
);
