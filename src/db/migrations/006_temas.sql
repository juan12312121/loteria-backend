-- Temas de color de la app como skins canjeables (tipo "tema")
ALTER TABLE skins DROP CONSTRAINT IF EXISTS skins_tipo_check;
ALTER TABLE skins ADD CONSTRAINT skins_tipo_check CHECK (tipo IN ('ficha','carta','avatar','fondo','tema'));
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS skin_tema_id uuid REFERENCES skins(id) ON DELETE SET NULL;
