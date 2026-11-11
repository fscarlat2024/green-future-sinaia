-- Stripe: pregatire pentru plata online prin Stripe Checkout
-- properties: flag pe apartament (0 = fara plata online, 1 = cu plata online)
ALTER TABLE properties ADD COLUMN stripe_enabled INTEGER NOT NULL DEFAULT 0;

-- bookings: starea platii si identificatorii Stripe
ALTER TABLE bookings ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE bookings ADD COLUMN stripe_session_id TEXT;
ALTER TABLE bookings ADD COLUMN stripe_payment_intent TEXT;
ALTER TABLE bookings ADD COLUMN paid_at INTEGER;

-- lookup rapid dupa session id (webhook)
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session ON bookings(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent ON bookings(stripe_payment_intent);
