import { BaseRepository } from '../../core/repository/BaseRepository';
import { Movimiento } from './movimiento.model';

export class MovimientoRepository extends BaseRepository<Movimiento> {
  /** Lo que apostó cada jugador en una partida (en positivo, listo para reembolsar). */
  apostadoPorUsuario(partidaId: string) {
    return this.filas<{ usuario_id: string; monto: number }>(
      `SELECT usuario_id, -sum(monto)::int AS monto FROM movimientos
       WHERE partida_id = $1 AND tipo = 'apuesta' GROUP BY usuario_id`,
      [partidaId],
    );
  }
}
