import { pool, Db } from '../../db/pool';
import { ZONA_HORARIA } from '../../juego/Progreso';

export class AvisoRepository {
  constructor(private readonly db: Db = pool) {}

  /** Guarda (o refresca) el token de este celular. */
  registrar(usuarioId: string, token: string) {
    return this.db.query(
      `INSERT INTO dispositivos (token, usuario_id) VALUES ($1,$2)
       ON CONFLICT (token) DO UPDATE SET usuario_id = EXCLUDED.usuario_id, creado_en = now()`,
      [token, usuarioId],
    );
  }

  borrar(token: string) {
    return this.db.query('DELETE FROM dispositivos WHERE token = $1', [token]);
  }

  async deUsuarios(usuarioIds: string[]) {
    if (!usuarioIds.length) return [];
    const { rows } = await this.db.query<{ token: string }>('SELECT token FROM dispositivos WHERE usuario_id = ANY($1)', [usuarioIds]);
    return rows.map((r) => r.token);
  }

  /** Miembros de la sala menos el que hizo la acción (a ellos les llega el aviso). */
  async miembrosDeSala(salaId: string, exceptoId: string) {
    const { rows } = await this.db.query<{ usuario_id: string }>(
      `SELECT sj.usuario_id FROM sala_jugadores sj JOIN usuarios u ON u.id = sj.usuario_id
       WHERE sj.sala_id = $1 AND sj.usuario_id <> $2 AND u.rol <> 'bot'`,
      [salaId, exceptoId],
    );
    return rows.map((r) => r.usuario_id);
  }

  /** Jugadores con app instalada que hoy no han cobrado su recompensa diaria. */
  async pendientesDelDiario(hoy: string) {
    const { rows } = await this.db.query<{ usuario_id: string }>(
      `SELECT DISTINCT d.usuario_id FROM dispositivos d JOIN usuarios u ON u.id = d.usuario_id
       WHERE u.rol <> 'bot' AND (u.ultimo_diario IS NULL OR u.ultimo_diario < $1::date)
         AND u.creado_en < now() - interval '1 day'`,
      [hoy],
    );
    return rows.map((r) => r.usuario_id);
  }

  /** Día local (México) de hoy, según la base. */
  async hoy() {
    const { rows } = await this.db.query<{ dia: string }>(`SELECT (now() AT TIME ZONE '${ZONA_HORARIA}')::date::text AS dia`);
    return rows[0].dia;
  }
}
