import { BaseRepository } from '../../core/repository/BaseRepository';
import { EstadoPartida } from './partida.model';
import { PartidaTabla, TablaEnJuego } from './partida-tabla.model';

export class PartidaTablaRepository extends BaseRepository<PartidaTabla> {
  async contarEnPartida(partidaId: string) {
    const r = await this.fila<{ n: number }>('SELECT count(*)::int AS n FROM partida_tablas WHERE partida_id = $1', [partidaId]);
    return r!.n;
  }

  async contarDeUsuario(partidaId: string, usuarioId: string) {
    const r = await this.fila<{ n: number }>(
      'SELECT count(*)::int AS n FROM partida_tablas WHERE partida_id = $1 AND usuario_id = $2',
      [partidaId, usuarioId],
    );
    return r!.n;
  }

  async ocupada(partidaId: string, tablaId: string) {
    return (await this.ejecutar('SELECT 1 FROM partida_tablas WHERE partida_id = $1 AND tabla_id = $2', [partidaId, tablaId])) > 0;
  }

  /** La tabla elegida junto con el estado y la sala de su partida. */
  conPartida(id: string) {
    return this.fila<PartidaTabla & { estado: EstadoPartida; sala_id: string }>(
      `SELECT pt.*, p.estado, p.sala_id FROM partida_tablas pt JOIN partidas p ON p.id = pt.partida_id WHERE pt.id = $1`,
      [id],
    );
  }

  marcar(id: string, usuarioId: string, marcas: number) {
    return this.fila<PartidaTabla>('UPDATE partida_tablas SET marcas = $2 WHERE id = $1 AND usuario_id = $3 RETURNING *', [id, marcas, usuarioId]);
  }

  /** Todas las tablas que siguen en juego (no quemadas) con sus cartas. */
  enJuego(partidaId: string) {
    return this.filas<TablaEnJuego>(
      `SELECT pt.id, pt.usuario_id, pt.tabla_id, t.nombre AS tabla, t.cartas, u.nombre
       FROM partida_tablas pt JOIN tablas t ON t.id = pt.tabla_id JOIN usuarios u ON u.id = pt.usuario_id
       WHERE pt.partida_id = $1 AND NOT pt.quemada`,
      [partidaId],
    );
  }

  misTablas(partidaId: string, usuarioId: string) {
    return this.filas(
      `SELECT pt.id, pt.tabla_id, t.nombre, t.cartas, pt.marcas, pt.quemada
       FROM partida_tablas pt JOIN tablas t ON t.id = pt.tabla_id
       WHERE pt.partida_id = $1 AND pt.usuario_id = $2 ORDER BY pt.creado_en`,
      [partidaId, usuarioId],
    );
  }

  /** Quién tiene cada tabla, con sus skins para dibujarlo. */
  ocupadas(partidaId: string) {
    return this.filas(
      `SELECT pt.tabla_id, u.id AS usuario_id, u.nombre, sf.clave AS skin_ficha, sc.clave AS skin_carta
       FROM partida_tablas pt JOIN usuarios u ON u.id = pt.usuario_id
       LEFT JOIN skins sf ON sf.id = u.skin_ficha_id LEFT JOIN skins sc ON sc.id = u.skin_carta_id
       WHERE pt.partida_id = $1`,
      [partidaId],
    );
  }

  /** Jugadores de la partida: cuántas tablas jugó cada quien y si ganó. */
  participantes(partidaId: string) {
    return this.filas<{ usuario_id: string; tablas: number; gano: boolean }>(
      `SELECT usuario_id, count(*)::int AS tablas,
              exists(SELECT 1 FROM reclamos r WHERE r.partida_id = $1 AND r.usuario_id = pt.usuario_id AND r.valido) AS gano
       FROM partida_tablas pt WHERE partida_id = $1 GROUP BY usuario_id`,
      [partidaId],
    );
  }
}
