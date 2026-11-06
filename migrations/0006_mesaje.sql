-- O conversatie pentru fiecare pereche oaspete + apartament.
CREATE TABLE chats (
  id INTEGER PRIMARY KEY,
  property_slug TEXT NOT NULL REFERENCES properties(slug),
  guest_id INTEGER NOT NULL REFERENCES guests(id),
  unread_owner INTEGER NOT NULL DEFAULT 0,
  unread_guest INTEGER NOT NULL DEFAULT 0,
  last_at INTEGER NOT NULL,
  UNIQUE (property_slug, guest_id)
);
CREATE INDEX chats_guest ON chats(guest_id, last_at);
CREATE INDEX chats_property ON chats(property_slug, last_at);
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES chats(id),
  sender TEXT NOT NULL,                -- guest | owner
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX messages_chat ON messages(chat_id, id);
