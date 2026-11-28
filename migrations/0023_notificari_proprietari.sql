-- Notificarile trimise de proprietari catre oaspetii apartamentelor lor (o data pe saptamana).
CREATE TABLE owner_pushes (
  id INTEGER PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  property_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX owner_pushes_admin ON owner_pushes(admin_id, created_at);
