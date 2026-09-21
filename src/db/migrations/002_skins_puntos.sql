-- Puntos (no se apuestan; se ganan jugando y se canjean por skins)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS puntos integer NOT NULL DEFAULT 0 CHECK (puntos >= 0);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS racha   integer NOT NULL DEFAULT 0 CHECK (racha >= 0);
ALTER TABLE figuras  ADD COLUMN IF NOT EXISTS puntos  integer NOT NULL DEFAULT 30 CHECK (puntos >= 0);
ALTER TABLE partidas ADD COLUMN IF NOT EXISTS puntos_otorgados boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS skins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo          text NOT NULL CHECK (tipo IN ('ficha','carta')),
  clave         text NOT NULL UNIQUE,
  nombre        text NOT NULL,
  descripcion   text NOT NULL DEFAULT '',
  imagen_url    text,
  precio_puntos integer NOT NULL DEFAULT 0 CHECK (precio_puntos >= 0),
  rareza        text NOT NULL DEFAULT 'comun' CHECK (rareza IN ('comun','rara','epica','legendaria')),
  activa        boolean NOT NULL DEFAULT true,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuario_skins (
  usuario_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  skin_id     uuid NOT NULL REFERENCES skins(id) ON DELETE CASCADE,
  obtenido_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, skin_id)
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS skin_ficha_id uuid REFERENCES skins(id) ON DELETE SET NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS skin_carta_id uuid REFERENCES skins(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS puntos_movimientos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  partida_id    uuid REFERENCES partidas(id) ON DELETE SET NULL,
  tipo          text NOT NULL CHECK (tipo IN ('participacion','victoria','bono','penalizacion','canje','ajuste')),
  monto         integer NOT NULL,
  saldo_despues integer NOT NULL,
  detalle       text NOT NULL DEFAULT '',
  creado_en     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS puntos_movimientos_usuario ON puntos_movimientos (usuario_id, creado_en DESC);

-- Puntos base por figura (más difícil = más puntos)
UPDATE figuras SET puntos = CASE clave
  WHEN 'llena' THEN 100 WHEN 'marco' THEN 70 WHEN 'linea' THEN 30
  WHEN 'esquinas' THEN 25 WHEN 'centro' THEN 25 WHEN 'cuadrito' THEN 20 ELSE 30 END;
