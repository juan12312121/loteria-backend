import { pool, Db } from '../../db/pool';

/** Cuánto aguanta la presencia sin señal antes de contarse como desconectado. */
const MINUTOS_EN_LINEA = 3;

export interface Amigo {
  id: string;
  nombre: string;
  codigo_amigo: string;
  avatar: string | null;
  puntos_ganados: number;
  en_linea: boolean;
  /** Sala abierta donde anda ahora (para caerle de un toque) */
  sala_id: string | null;
  sala_nombre: string | null;
  sala_codigo: string | null;
  sala_privada: boolean;
}

export interface Solicitud {
  id: string;
  nombre: string;
  avatar: string | null;
  creado_en: string;
}

const EN_LINEA = `(u.conectado AND u.visto_en > now() - interval '${MINUTOS_EN_LINEA} minutes')`;

/** Sala abierta o jugando donde está el amigo (la más reciente). */
const SALA = `(
  SELECT to_jsonb(x) FROM (
    SELECT s.id, s.nombre, s.codigo, s.privada
    FROM sala_jugadores sj JOIN salas s ON s.id = sj.sala_id
    WHERE sj.usuario_id = u.id AND s.estado <> 'cerrada' AND sj.conectado
    ORDER BY s.creado_en DESC LIMIT 1
  ) x
)`;

export class AmigoRepository {
  constructor(private readonly db: Db = pool) {}

  con(db: Db) {
    return new AmigoRepository(db);
  }

  private async filas<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const { rows } = await this.db.query(sql, params);
    return rows as T[];
  }

  porCodigo(codigo: string) {
    return this.db
      .query<{ id: string; nombre: string }>('SELECT id, nombre FROM usuarios WHERE codigo_amigo = $1 AND rol <> $2', [
        codigo.toUpperCase(),
        'bot',
      ])
      .then((r) => r.rows[0] ?? null);
  }

  /** Amigos aceptados, con presencia y en qué sala andan. */
  async lista(usuarioId: string): Promise<Amigo[]> {
    const filas = await this.filas<Omit<Amigo, 'sala_id' | 'sala_nombre' | 'sala_codigo' | 'sala_privada'> & { sala: any }>(
      `SELECT u.id, u.nombre, u.codigo_amigo, sa.clave AS avatar, ${EN_LINEA} AS en_linea, ${SALA} AS sala,
              (SELECT coalesce(sum(monto), 0)::int FROM puntos_movimientos pm WHERE pm.usuario_id = u.id AND pm.monto > 0) AS puntos_ganados
       FROM amistades a
       JOIN usuarios u ON u.id = CASE WHEN a.solicitante_id = $1 THEN a.destinatario_id ELSE a.solicitante_id END
       LEFT JOIN skins sa ON sa.id = u.skin_avatar_id
       WHERE a.estado = 'aceptada' AND $1 IN (a.solicitante_id, a.destinatario_id)
       ORDER BY ${EN_LINEA} DESC, u.nombre`,
      [usuarioId],
    );
    return filas.map(({ sala, ...amigo }) => ({
      ...amigo,
      sala_id: sala?.id ?? null,
      sala_nombre: sala?.nombre ?? null,
      sala_codigo: sala?.codigo ?? null,
      sala_privada: sala?.privada ?? false,
    }));
  }

  /** Solicitudes que me mandaron y que aún no acepto. */
  pendientes(usuarioId: string) {
    return this.filas<Solicitud>(
      `SELECT u.id, u.nombre, sa.clave AS avatar, a.creado_en
       FROM amistades a JOIN usuarios u ON u.id = a.solicitante_id
       LEFT JOIN skins sa ON sa.id = u.skin_avatar_id
       WHERE a.destinatario_id = $1 AND a.estado = 'pendiente' ORDER BY a.creado_en`,
      [usuarioId],
    );
  }

  /** Solicitudes que yo mandé y siguen esperando. */
  enviadas(usuarioId: string) {
    return this.filas<Solicitud>(
      `SELECT u.id, u.nombre, sa.clave AS avatar, a.creado_en
       FROM amistades a JOIN usuarios u ON u.id = a.destinatario_id
       LEFT JOIN skins sa ON sa.id = u.skin_avatar_id
       WHERE a.solicitante_id = $1 AND a.estado = 'pendiente' ORDER BY a.creado_en`,
      [usuarioId],
    );
  }

  async relacion(unoId: string, otroId: string) {
    const { rows } = await this.db.query<{ solicitante_id: string; estado: string }>(
      `SELECT solicitante_id, estado FROM amistades
       WHERE (solicitante_id, destinatario_id) IN (($1,$2), ($2,$1))`,
      [unoId, otroId],
    );
    return rows[0] ?? null;
  }

  solicitar(solicitanteId: string, destinatarioId: string) {
    return this.db.query('INSERT INTO amistades (solicitante_id, destinatario_id) VALUES ($1,$2)', [solicitanteId, destinatarioId]);
  }

  /** Acepta la solicitud que me mandó `solicitanteId`; false si no existía. */
  async aceptar(solicitanteId: string, destinatarioId: string) {
    const r = await this.db.query(
      `UPDATE amistades SET estado = 'aceptada' WHERE solicitante_id = $1 AND destinatario_id = $2 AND estado = 'pendiente'`,
      [solicitanteId, destinatarioId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async quitar(unoId: string, otroId: string) {
    const r = await this.db.query(
      `DELETE FROM amistades WHERE (solicitante_id, destinatario_id) IN (($1,$2), ($2,$1))`,
      [unoId, otroId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  /** Revanchas: partidas jugadas juntos y cuántas ganó cada quien. */
  async historial(unoId: string, otroId: string) {
    const { rows } = await this.db.query(
      `WITH juntas AS (
         SELECT p.id FROM partidas p
         WHERE p.estado = 'terminada'
           AND EXISTS (SELECT 1 FROM partida_tablas t WHERE t.partida_id = p.id AND t.usuario_id = $1)
           AND EXISTS (SELECT 1 FROM partida_tablas t WHERE t.partida_id = p.id AND t.usuario_id = $2)
       )
       SELECT count(*)::int AS juntas,
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM reclamos r WHERE r.partida_id = j.id AND r.usuario_id = $1 AND r.valido))::int AS gane,
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM reclamos r WHERE r.partida_id = j.id AND r.usuario_id = $2 AND r.valido))::int AS gano
       FROM juntas j`,
      [unoId, otroId],
    );
    return rows[0] as { juntas: number; gane: number; gano: number };
  }

  /** Marca presencia (al conectarse por Socket.IO y en cada evento). */
  presencia(usuarioId: string, conectado: boolean) {
    return this.db.query('UPDATE usuarios SET conectado = $2, visto_en = now() WHERE id = $1', [usuarioId, conectado]);
  }
}
