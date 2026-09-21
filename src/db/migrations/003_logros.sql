-- Figuras intermedias: no terminan la ronda, solo se anuncian (y la primera da puntos).
-- La ronda termina con la figura final de la sala (por defecto: tabla llena).
ALTER TABLE figuras ADD COLUMN IF NOT EXISTS intermedia boolean NOT NULL DEFAULT false;
UPDATE figuras SET intermedia = clave IN ('esquinas', 'marco');

CREATE TABLE IF NOT EXISTS logros (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id       uuid NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  partida_tabla_id uuid NOT NULL REFERENCES partida_tablas(id) ON DELETE CASCADE,
  usuario_id       uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  figura_id        smallint NOT NULL REFERENCES figuras(id),
  indice           integer NOT NULL,
  mascara          integer NOT NULL,
  puntos           integer NOT NULL DEFAULT 0,
  primero          boolean NOT NULL DEFAULT false,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partida_tabla_id, figura_id)
);
CREATE INDEX IF NOT EXISTS logros_partida ON logros (partida_id, figura_id, indice);

ALTER TABLE puntos_movimientos DROP CONSTRAINT IF EXISTS puntos_movimientos_tipo_check;
ALTER TABLE puntos_movimientos ADD CONSTRAINT puntos_movimientos_tipo_check
  CHECK (tipo IN ('participacion','victoria','logro','bono','penalizacion','canje','ajuste'));
