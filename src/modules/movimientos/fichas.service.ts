import { Db } from '../../db/pool';
import { UsuarioRepository } from '../usuarios/usuario.repository';
import { MovimientoRepository } from './movimiento.repository';
import { TipoMovimiento } from './movimiento.model';

/**
 * Todo movimiento de fichas pasa por aquí: cambia el saldo y deja bitácora
 * en la misma transacción (`db` debe ser el cliente de la transacción).
 */
export class FichasService {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly movimientos: MovimientoRepository,
  ) {}

  /** Devuelve el saldo nuevo, o null si no le alcanzaba. */
  async mover(db: Db, usuarioId: string, monto: number, tipo: TipoMovimiento, partidaId: string | null) {
    const saldo = await this.usuarios.con(db).sumarFichas(usuarioId, monto);
    if (saldo === null) return null;
    await this.movimientos.con(db).crear({ usuario_id: usuarioId, partida_id: partidaId, tipo, monto, saldo_despues: saldo });
    return saldo;
  }

  /** Regresa a cada jugador lo que apostó en la partida. */
  async reembolsarApuestas(db: Db, partidaId: string) {
    const apuestas = await this.movimientos.con(db).apostadoPorUsuario(partidaId);
    for (const a of apuestas) await this.mover(db, a.usuario_id, a.monto, 'reembolso', partidaId);
  }
}
