CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS usuarios (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         text NOT NULL,
  correo         text NOT NULL UNIQUE,
  password_hash  text NOT NULL,
  rol            text NOT NULL DEFAULT 'jugador' CHECK (rol IN ('jugador','admin')),
  fichas         integer NOT NULL DEFAULT 100 CHECK (fichas >= 0),
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cartas (
  id         smallint PRIMARY KEY CHECK (id BETWEEN 1 AND 54),
  nombre     text NOT NULL,
  verso      text NOT NULL DEFAULT '',
  imagen_url text
);

CREATE TABLE IF NOT EXISTS figuras (
  id          smallserial PRIMARY KEY,
  clave       text NOT NULL UNIQUE,
  nombre      text NOT NULL,
  mascaras    integer[] NOT NULL,
  descripcion text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tablas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  cartas     smallint[] NOT NULL CHECK (array_length(cartas, 1) = 16),
  oficial    boolean NOT NULL DEFAULT false,
  creado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS salas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        char(6) NOT NULL UNIQUE,
  nombre        text NOT NULL,
  anfitrion_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  figura_id     smallint NOT NULL REFERENCES figuras(id),
  modo_cantor   text NOT NULL DEFAULT 'automatico' CHECK (modo_cantor IN ('automatico','manual')),
  velocidad_ms  integer NOT NULL DEFAULT 5000 CHECK (velocidad_ms BETWEEN 1000 AND 60000),
  max_jugadores integer NOT NULL DEFAULT 10 CHECK (max_jugadores BETWEEN 1 AND 100),
  max_tablas    integer NOT NULL DEFAULT 4 CHECK (max_tablas BETWEEN 1 AND 10),
  costo_tabla   integer NOT NULL DEFAULT 0 CHECK (costo_tabla >= 0),
  privada       boolean NOT NULL DEFAULT false,
  estado        text NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','jugando','cerrada')),
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sala_jugadores (
  sala_id    uuid NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol        text NOT NULL DEFAULT 'jugador' CHECK (rol IN ('anfitrion','jugador')),
  conectado  boolean NOT NULL DEFAULT false,
  unido_en   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sala_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS partidas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id      uuid NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  numero       integer NOT NULL,
  figura_id    smallint NOT NULL REFERENCES figuras(id),
  mazo         smallint[] NOT NULL,
  indice       integer NOT NULL DEFAULT 0 CHECK (indice BETWEEN 0 AND 54),
  pozo         integer NOT NULL DEFAULT 0 CHECK (pozo >= 0),
  estado       text NOT NULL DEFAULT 'preparando'
               CHECK (estado IN ('preparando','cantando','pausada','terminada','cancelada')),
  iniciada_en  timestamptz,
  terminada_en timestamptz,
  creado_en    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sala_id, numero)
);

CREATE TABLE IF NOT EXISTS cantadas (
  partida_id uuid NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  orden      integer NOT NULL,
  carta_id   smallint NOT NULL REFERENCES cartas(id),
  cantada_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partida_id, orden),
  UNIQUE (partida_id, carta_id)
);

CREATE TABLE IF NOT EXISTS partida_tablas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id uuid NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tabla_id   uuid NOT NULL REFERENCES tablas(id),
  marcas     integer NOT NULL DEFAULT 0,
  quemada    boolean NOT NULL DEFAULT false,
  creado_en  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partida_id, tabla_id)
);
CREATE INDEX IF NOT EXISTS partida_tablas_usuario ON partida_tablas (partida_id, usuario_id);

CREATE TABLE IF NOT EXISTS reclamos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id       uuid NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  partida_tabla_id uuid NOT NULL REFERENCES partida_tablas(id) ON DELETE CASCADE,
  usuario_id       uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  indice_al_gritar integer NOT NULL,
  valido           boolean NOT NULL,
  mascara_ganadora integer,
  premio           integer NOT NULL DEFAULT 0,
  motivo           text NOT NULL DEFAULT '',
  creado_en        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movimientos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  partida_id    uuid REFERENCES partidas(id) ON DELETE SET NULL,
  tipo          text NOT NULL CHECK (tipo IN ('apuesta','premio','bono','ajuste','reembolso')),
  monto         integer NOT NULL,
  saldo_despues integer NOT NULL,
  creado_en     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS movimientos_usuario ON movimientos (usuario_id, creado_en DESC);
