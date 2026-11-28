-- Cateva recenzii copiate de pe Booking, afisate in cardul cu nota de pe pagina apartamentului.
-- JSON: [{"text": "...", "author": "..."}]. Le pune doar administratorul.
ALTER TABLE properties ADD COLUMN booking_reviews TEXT;
