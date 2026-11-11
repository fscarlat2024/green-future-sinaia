-- Nota de pe Booking pentru apartamentele adaugate din panou (o pune doar administratorul).
ALTER TABLE properties ADD COLUMN booking_url TEXT;
ALTER TABLE properties ADD COLUMN booking_score REAL;
ALTER TABLE properties ADD COLUMN booking_count INTEGER;
