-- Comenzi de la restaurant cu plata pe nota camerei.
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  apartment TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  note TEXT,
  items TEXT NOT NULL,                 -- JSON: [{id, name, price, qty}], cu pretul din momentul comenzii
  total INTEGER NOT NULL,
  status TEXT NOT NULL,                -- new | confirmed | delivered | cancelled
  demo INTEGER NOT NULL DEFAULT 0,
  lang TEXT NOT NULL DEFAULT 'ro',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX orders_status ON orders(status, created_at);
