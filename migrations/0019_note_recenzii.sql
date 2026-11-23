-- Recenzii pe categorii, ca pe Booking (1-10). Nota generala (score) devine media lor. Recenziile vechi raman doar cu nota generala.
ALTER TABLE reviews ADD COLUMN cleanliness INTEGER;
ALTER TABLE reviews ADD COLUMN comfort INTEGER;
ALTER TABLE reviews ADD COLUMN facilities INTEGER;
ALTER TABLE reviews ADD COLUMN location INTEGER;
ALTER TABLE reviews ADD COLUMN host INTEGER;
ALTER TABLE reviews ADD COLUMN value INTEGER;
