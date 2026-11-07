-- Cardul de membru: apare doar dupa ce oaspetele isi confirma emailul si exista o rezervare confirmata pe acel email.
ALTER TABLE guests ADD COLUMN email_verified_at INTEGER;
ALTER TABLE guests ADD COLUMN verify_code_hash TEXT;
ALTER TABLE guests ADD COLUMN verify_expires INTEGER;
ALTER TABLE guests ADD COLUMN verify_attempts INTEGER NOT NULL DEFAULT 0;
CREATE INDEX bookings_email ON bookings(guest_email);
