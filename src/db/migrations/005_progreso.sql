-- Nuevos tipos de skin (avatar y fondo de sala), skins de temporada y exclusivas de misión/ranking
ALTER TABLE skins DROP CONSTRAINT IF EXISTS skins_tipo_check;
ALTER TABLE skins ADD CONSTRAINT skins_tipo_check CHECK (tipo IN ('ficha','carta','avatar','fondo'));
-- 'MM-DD'; si inicio > fin la temporada cruza el año (dic–ene)
ALTER TABLE skins ADD COLUMN IF NOT EXISTS temporada_inicio char(5);
ALTER TABLE skins ADD COLUMN IF NOT EXISTS temporada_fin char(5);
-- No se compra: solo se gana (misión o ranking semanal)
ALTER TABLE skins ADD COLUMN IF NOT EXISTS exclusiva boolean NOT NULL DEFAULT false;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS skin_avatar_id uuid REFERENCES skins(id) ON DELETE SET NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS skin_fondo_id uuid REFERENCES skins(id) ON DELETE SET NULL;

-- Bots para llenar salas
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('jugador','admin','bot'));

-- Recompensa diaria y mejor racha de victorias
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dias_seguidos integer NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_diario date;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS mejor_racha integer NOT NULL DEFAULT 0;
UPDATE usuarios SET mejor_racha = racha WHERE mejor_racha < racha;

-- Misiones: el progreso se calcula de lo jugado; aquí solo se guarda qué ya se cobró
CREATE TABLE IF NOT EXISTS misiones_cobradas (
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  clave      text NOT NULL,
  periodo    text NOT NULL,
  cobrada_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, clave, periodo)
);

-- Semanas cuyo ranking ya se premió
CREATE TABLE IF NOT EXISTS premios_semanales (
  semana      date PRIMARY KEY,
  ganadores   jsonb NOT NULL DEFAULT '[]',
  otorgado_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE puntos_movimientos DROP CONSTRAINT IF EXISTS puntos_movimientos_tipo_check;
ALTER TABLE puntos_movimientos ADD CONSTRAINT puntos_movimientos_tipo_check
  CHECK (tipo IN ('participacion','victoria','logro','bono','penalizacion','canje','ajuste','diario','mision','ranking'));

CREATE INDEX IF NOT EXISTS reclamos_usuario ON reclamos (usuario_id, creado_en);
CREATE INDEX IF NOT EXISTS logros_usuario ON logros (usuario_id, creado_en);
CREATE INDEX IF NOT EXISTS partida_tablas_usuario_fecha ON partida_tablas (usuario_id, creado_en);
