import { pool, Db } from '../../db/pool';
import { Metrica, ZONA_HORARIA } from '../../juego/Progreso';

/** Día local (México) de una columna timestamptz. */
const dia = (col: string) => `(${col} AT TIME ZONE '${ZONA_HORARIA}')::date`;
/** Filtro de rango [desde, hasta) sobre una columna; por defecto $2 = desde (o null) y $3 = hasta. */
const enRango = (col: string, desde = 2, hasta = 3) =>
  `($${desde}::date IS NULL OR ${dia(col)} >= $${desde}::date) AND ${dia(col)} < $${hasta}::date`;

export type Metricas = Record<Metrica, number>;

export interface FilaRanking {
  usuario_id: string;
  nombre: string;
  avatar: string | null;
  puntos: number;
}

/**
 * Consultas de progreso. No hay contadores: todo se calcula de lo que ya se
 * guarda al jugar (tablas, reclamos, logros, movimientos de puntos).
 */
export class ProgresoRepository {
  constructor(private readonly db: Db = pool) {}

  con(db: Db) {
    return new ProgresoRepository(db);
  }

  /** Cuánto lleva un jugador en cada métrica dentro del rango. */
  async metricas(usuarioId: string, desde: string | null, hasta: string): Promise<Metricas> {
    const { rows } = await this.db.query(
      `SELECT
        (SELECT count(DISTINCT pt.partida_id)::int FROM partida_tablas pt JOIN partidas p ON p.id = pt.partida_id
          WHERE pt.usuario_id = $1 AND p.estado = 'terminada' AND ${enRango('p.terminada_en')}) AS partidas,
        (SELECT count(*)::int FROM partida_tablas pt JOIN partidas p ON p.id = pt.partida_id
          WHERE pt.usuario_id = $1 AND p.estado = 'terminada' AND ${enRango('p.terminada_en')}) AS tablas,
        (SELECT count(*)::int FROM reclamos r WHERE r.usuario_id = $1 AND r.valido AND ${enRango('r.creado_en')}) AS victorias,
        (SELECT count(*)::int FROM reclamos r WHERE r.usuario_id = $1 AND r.valido AND ${enRango('r.creado_en')}
          AND (SELECT count(*) FROM partida_tablas x WHERE x.partida_id = r.partida_id AND x.usuario_id = r.usuario_id) >= 3
        ) AS victorias_multitabla,
        (SELECT count(*)::int FROM reclamos r WHERE r.usuario_id = $1 AND r.valido AND r.indice_al_gritar < 30
          AND ${enRango('r.creado_en')}) AS victorias_rapidas,
        (SELECT count(*)::int FROM logros l WHERE l.usuario_id = $1 AND ${enRango('l.creado_en')}) AS logros`,
      [usuarioId, desde, hasta],
    );
    return rows[0];
  }

  async cobradas(usuarioId: string, periodos: string[]) {
    const { rows } = await this.db.query<{ clave: string; periodo: string }>(
      'SELECT clave, periodo FROM misiones_cobradas WHERE usuario_id = $1 AND periodo = ANY($2)',
      [usuarioId, periodos],
    );
    return new Set(rows.map((r) => `${r.clave}:${r.periodo}`));
  }

  /** Marca la misión como cobrada; false si ya lo estaba (evita cobrar dos veces). */
  async cobrar(usuarioId: string, clave: string, periodo: string) {
    const r = await this.db.query(
      'INSERT INTO misiones_cobradas (usuario_id, clave, periodo) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [usuarioId, clave, periodo],
    );
    return (r.rowCount ?? 0) > 0;
  }

  /** Puntos ganados JUGANDO en la semana (no cuentan bonos, misiones ni compras). */
  async rankingSemana(desde: string, hasta: string, limite: number): Promise<FilaRanking[]> {
    const { rows } = await this.db.query(
      `SELECT u.id AS usuario_id, u.nombre, sa.clave AS avatar, sum(pm.monto)::int AS puntos
       FROM puntos_movimientos pm JOIN usuarios u ON u.id = pm.usuario_id
       LEFT JOIN skins sa ON sa.id = u.skin_avatar_id
       WHERE u.rol <> 'bot' AND pm.tipo IN ('participacion','victoria','logro') AND ${enRango('pm.creado_en', 1, 2)}
       GROUP BY u.id, u.nombre, sa.clave HAVING sum(pm.monto) > 0
       ORDER BY puntos DESC, min(pm.creado_en) LIMIT $3`,
      [desde, hasta, limite],
    );
    return rows;
  }

  /** Reserva la semana para premiarla; false si ya se premió. */
  async reservarSemana(semana: string) {
    const r = await this.db.query('INSERT INTO premios_semanales (semana) VALUES ($1) ON CONFLICT DO NOTHING', [semana]);
    return (r.rowCount ?? 0) > 0;
  }

  guardarGanadoresSemana(semana: string, ganadores: unknown) {
    return this.db.query('UPDATE premios_semanales SET ganadores = $2 WHERE semana = $1', [semana, JSON.stringify(ganadores)]);
  }

  async ultimaSemanaPremiada() {
    const { rows } = await this.db.query('SELECT semana::text, ganadores FROM premios_semanales ORDER BY semana DESC LIMIT 1');
    return (rows[0] as { semana: string; ganadores: unknown[] } | undefined) ?? null;
  }

  // ---------- perfil ----------

  async estadisticas(usuarioId: string) {
    const { rows } = await this.db.query(
      `SELECT u.id, u.nombre, u.puntos, u.racha, u.mejor_racha, u.dias_seguidos, u.creado_en,
        sa.clave AS avatar, sf.clave AS skin_ficha, sc.clave AS skin_carta,
        (SELECT coalesce(sum(monto), 0)::int FROM puntos_movimientos WHERE usuario_id = u.id AND monto > 0) AS puntos_ganados,
        (SELECT count(*)::int FROM usuario_skins WHERE usuario_id = u.id) AS skins,
        (SELECT count(*)::int FROM skins WHERE activa) AS skins_total
       FROM usuarios u
       LEFT JOIN skins sa ON sa.id = u.skin_avatar_id LEFT JOIN skins sf ON sf.id = u.skin_ficha_id
       LEFT JOIN skins sc ON sc.id = u.skin_carta_id
       WHERE u.id = $1`,
      [usuarioId],
    );
    return rows[0] ?? null;
  }

  /** La carta con la que más veces ha ganado (la que completó su tabla). */
  async cartaDeLaSuerte(usuarioId: string) {
    const { rows } = await this.db.query(
      `SELECT ca.id, ca.nombre, count(*)::int AS veces
       FROM reclamos r JOIN cantadas c ON c.partida_id = r.partida_id AND c.orden = r.indice_al_gritar
       JOIN cartas ca ON ca.id = c.carta_id
       WHERE r.usuario_id = $1 AND r.valido GROUP BY ca.id, ca.nombre ORDER BY veces DESC, ca.id LIMIT 1`,
      [usuarioId],
    );
    return rows[0] ?? null;
  }

  /** Figura intermedia que más ha logrado. */
  async figuraFavorita(usuarioId: string) {
    const { rows } = await this.db.query(
      `SELECT f.clave, f.nombre, count(*)::int AS veces FROM logros l JOIN figuras f ON f.id = l.figura_id
       WHERE l.usuario_id = $1 GROUP BY f.clave, f.nombre ORDER BY veces DESC LIMIT 1`,
      [usuarioId],
    );
    return rows[0] ?? null;
  }

  /** Últimas partidas terminadas: sala, cuántas tablas jugó, si ganó y cuántos puntos sacó. */
  async historial(usuarioId: string, limite = 10) {
    const { rows } = await this.db.query(
      `SELECT p.id AS partida_id, p.terminada_en, s.nombre AS sala, count(pt.id)::int AS tablas,
        exists(SELECT 1 FROM reclamos r WHERE r.partida_id = p.id AND r.usuario_id = $1 AND r.valido) AS gano,
        (SELECT coalesce(sum(monto), 0)::int FROM puntos_movimientos pm WHERE pm.partida_id = p.id AND pm.usuario_id = $1) AS puntos
       FROM partida_tablas pt JOIN partidas p ON p.id = pt.partida_id JOIN salas s ON s.id = p.sala_id
       WHERE pt.usuario_id = $1 AND p.estado = 'terminada'
       GROUP BY p.id, p.terminada_en, s.nombre ORDER BY p.terminada_en DESC LIMIT $2`,
      [usuarioId, limite],
    );
    return rows;
  }
}
