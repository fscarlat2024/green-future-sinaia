-- Apartamente adaugate din panou. Cele existente raman 'published' si au pagina lor statica (dynamic = 0).
ALTER TABLE properties ADD COLUMN status TEXT NOT NULL DEFAULT 'published'; -- draft | pending | published
ALTER TABLE properties ADD COLUMN dynamic INTEGER NOT NULL DEFAULT 0;
ALTER TABLE properties ADD COLUMN room_type TEXT;
ALTER TABLE properties ADD COLUMN tagline TEXT;
ALTER TABLE properties ADD COLUMN description TEXT;
ALTER TABLE properties ADD COLUMN amenities TEXT;      -- JSON: lista de facilitati
CREATE TABLE property_photos (
  id INTEGER PRIMARY KEY,
  property_slug TEXT NOT NULL REFERENCES properties(slug),
  position INTEGER NOT NULL,
  data BLOB NOT NULL,                  -- JPEG micsorat in browser
  created_at INTEGER NOT NULL
);
CREATE INDEX property_photos_slug ON property_photos(property_slug, position);
