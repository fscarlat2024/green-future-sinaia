-- Pauza la citirea calendarului extern. Linkul si perioadele deja preluate raman.
ALTER TABLE properties ADD COLUMN ical_paused INTEGER NOT NULL DEFAULT 0;
