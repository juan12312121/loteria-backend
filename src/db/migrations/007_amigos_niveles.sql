-- Amigos, presencia, salas con contraseña, banco de fichas, niveles y pase de temporada

-- Código para agregar amigos (como el de la sala) y presencia global
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS codigo_amigo char(6);
UPDATE usuarios SET codigo_amigo = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  WHERE codigo_amigo IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_codigo_amigo ON usuarios (codigo_amigo);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS conectado boolean NOT NULL DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS visto_en timestamptz;

-- Banco de fichas: un puñito gratis al día cuando te quedas sin
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_banco date;
-- Último nivel cuyo premio ya se cobró
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nivel_cobrado integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS amistades (
  solicitante_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  destinatario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estado         text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aceptada')),
  creado_en      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (solicitante_id, destinatario_id),
  CHECK (solicitante_id <> destinatario_id)
);
CREATE INDEX IF NOT EXISTS amistades_destinatario ON amistades (destinatario_id, estado);

-- Salas con contraseña (además de las privadas por código)
ALTER TABLE salas ADD COLUMN IF NOT EXISTS password_hash text;

-- Pase de temporada: qué niveles ya cobró cada quien en cada mes
CREATE TABLE IF NOT EXISTS pase_cobrado (
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  temporada  char(7) NOT NULL,
  nivel      integer NOT NULL,
  cobrado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, temporada, nivel)
);

-- Tokens de las apps para mandar avisos al celular
CREATE TABLE IF NOT EXISTS dispositivos (
  token      text PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado_en  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dispositivos_usuario ON dispositivos (usuario_id);

ALTER TABLE puntos_movimientos DROP CONSTRAINT IF EXISTS puntos_movimientos_tipo_check;
ALTER TABLE puntos_movimientos ADD CONSTRAINT puntos_movimientos_tipo_check
  CHECK (tipo IN ('participacion','victoria','logro','bono','penalizacion','canje','ajuste','diario','mision','ranking','nivel','pase'));
