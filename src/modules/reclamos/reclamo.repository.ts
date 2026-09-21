import { BaseRepository } from '../../core/repository/BaseRepository';
import { Reclamo } from './reclamo.model';

export class ReclamoRepository extends BaseRepository<Reclamo> {
  /** Quién ganó la ronda (lo anunció el tablero). */
  ganadores(partidaId: string) {
    return this.filas(
      `SELECT r.usuario_id, u.nombre, r.premio, r.mascara_ganadora FROM reclamos r JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.partida_id = $1 AND r.valido`,
      [partidaId],
    );
  }
}
