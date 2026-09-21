import { Db } from '../../db/pool';
import { BaseService } from '../../core/service/BaseService';
import { BaseRepository } from '../../core/repository/BaseRepository';
import { puntosParticipacion, puntosVictoria, Desglose } from '../../juego/Puntos';
import { UsuarioRepository } from '../usuarios/usuario.repository';
import { PartidaRepository } from '../partidas/partida.repository';
import { PartidaTablaRepository } from '../partidas/partida-tabla.repository';
import { PuntosMovimiento, TipoPuntos } from './puntos.model';

/**
 * Puntos: se ganan jugando y se canjean por skins (no se apuestan).
 * Los métodos que reciben `db` deben correr dentro de una transacción.
 */
export class PuntosService extends BaseService<PuntosMovimiento> {
  constructor(
    repo: BaseRepository<PuntosMovimiento>,
    private readonly usuarios: UsuarioRepository,
    private readonly partidas: PartidaRepository,
    private readonly partidaTablas: PartidaTablaRepository,
  ) {
    super(repo);
  }

  async mover(db: Db, usuarioId: string, monto: number, tipo: TipoPuntos, partidaId: string | null, detalle = '') {
    const saldo = await this.usuarios.con(db).sumarPuntos(usuarioId, monto);
    if (saldo === null) return null;
    await this.registrar(db, usuarioId, partidaId, tipo, monto, saldo, detalle);
    return saldo;
  }

  /** Canje en la tienda; null si no alcanza. */
  async cobrar(db: Db, usuarioId: string, precio: number, detalle: string) {
    const saldo = await this.usuarios.con(db).cobrarPuntos(usuarioId, precio);
    if (saldo === null) return null;
    await this.registrar(db, usuarioId, null, 'canje', -precio, saldo, detalle);
    return saldo;
  }

  /** Premio al ganador: figura + multitabla + rapidez + racha. Llamar ANTES de cerrarPartida. */
  async premiarGanador(db: Db, partidaId: string, usuarioId: string, puntosFigura: number, indice: number): Promise<Desglose> {
    const racha = await this.usuarios.con(db).racha(usuarioId);
    const tablasJugadas = await this.partidaTablas.con(db).contarDeUsuario(partidaId, usuarioId);
    const d = puntosVictoria({ puntosFigura, indice, racha, tablasJugadas });
    const detalle = `figura ${d.figura} + multitabla ${d.multiTabla} + rapidez ${d.rapidez} + racha ${d.racha}`;
    await this.mover(db, usuarioId, d.total, 'victoria', partidaId, detalle);
    await this.usuarios.con(db).subirRacha(usuarioId);
    return d;
  }

  /** Una sola vez por partida: participación por tabla y reinicio de racha a quien no ganó. */
  async cerrarPartida(db: Db, partidaId: string) {
    if (!(await this.partidas.con(db).marcarPuntosOtorgados(partidaId))) return;
    const participantes = await this.partidaTablas.con(db).participantes(partidaId);
    for (const p of participantes) {
      await this.mover(db, p.usuario_id, puntosParticipacion(p.tablas), 'participacion', partidaId, `${p.tablas} tabla(s) jugada(s)`);
      if (!p.gano) await this.usuarios.con(db).reiniciarRacha(p.usuario_id);
    }
  }

  ranking(limite: number) {
    return this.usuarios.ranking(Math.min(100, Math.max(1, limite || 20)));
  }

  private registrar(db: Db, usuarioId: string, partidaId: string | null, tipo: TipoPuntos, monto: number, saldo: number, detalle: string) {
    return this.repo.con(db).crear({ usuario_id: usuarioId, partida_id: partidaId, tipo, monto, saldo_despues: saldo, detalle });
  }
}
