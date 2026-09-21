import { Actor } from '../../core/service/BaseService';
import { Conflict, Forbidden, NotFound, Unprocessable } from '../../core/http/HttpError';
import { transaccion } from '../../db/pool';
import { bus } from '../../juego/bus';
import { REGLAS_SALA } from '../../juego/MotorLoteria';
import { BaseRepository } from '../../core/repository/BaseRepository';
import { SalaService } from '../salas/sala.service';
import { Tabla } from '../tablas/tabla.model';
import { FichasService } from '../movimientos/fichas.service';
import { PartidaRepository } from './partida.repository';
import { PartidaTablaRepository } from './partida-tabla.repository';

/** Tablas que cada jugador elige para la ronda (puede jugar varias). */
export class TablasPartidaService {
  constructor(
    private readonly partidas: PartidaRepository,
    private readonly partidaTablas: PartidaTablaRepository,
    private readonly tablas: BaseRepository<Tabla>,
    private readonly salaService: SalaService,
    private readonly fichas: FichasService,
  ) {}

  /** Elige una tabla; si la sala cobra por tabla, se paga y va al pozo. */
  async elegir(partidaId: string, tablaId: string, actor: Actor) {
    const partida = await this.partidas.obtener(partidaId);
    if (!partida) throw new NotFound('Partida no encontrada');
    if (partida.estado !== 'preparando') throw new Unprocessable('Solo se eligen tablas antes de iniciar');
    await this.salaService.exigirMiembro(partida.sala_id, actor.id);
    const sala = await this.salaService.obtener(partida.sala_id);
    if (!(await this.tablas.obtener(tablaId))) throw new NotFound('Tabla no encontrada');

    const elegida = await transaccion(async (db) => {
      const partidaTablas = this.partidaTablas.con(db);
      if ((await partidaTablas.contarDeUsuario(partidaId, actor.id)) >= REGLAS_SALA.maxTablasPorJugador)
        throw new Conflict(`Máximo ${REGLAS_SALA.maxTablasPorJugador} tablas por jugador`);
      if (await partidaTablas.ocupada(partidaId, tablaId)) throw new Conflict('Esa tabla ya la tiene otro jugador');
      if (sala.costo_tabla > 0) {
        const saldo = await this.fichas.mover(db, actor.id, -sala.costo_tabla, 'apuesta', partidaId);
        if (saldo === null) throw new Unprocessable('No tienes fichas suficientes');
        await this.partidas.con(db).sumarPozo(partidaId, sala.costo_tabla);
      }
      return partidaTablas.crear({ partida_id: partidaId, usuario_id: actor.id, tabla_id: tablaId });
    });
    bus.emitir(partida.sala_id, 'partida:tablas', { partida_id: partidaId });
    return elegida;
  }

  /** Suelta una tabla antes de iniciar y recupera lo que pagó. */
  async soltar(partidaTablaId: string, actor: Actor) {
    const { partida_id, sala_id } = await transaccion(async (db) => {
      const pt = await this.partidaTablas.con(db).conPartida(partidaTablaId);
      if (!pt) throw new NotFound();
      if (pt.usuario_id !== actor.id) throw new Forbidden('Esa tabla no es tuya');
      if (pt.estado !== 'preparando') throw new Unprocessable('Ya empezó la partida');
      const sala = await this.salaService.obtener(pt.sala_id);
      if (sala.costo_tabla > 0) {
        await this.fichas.mover(db, actor.id, sala.costo_tabla, 'reembolso', pt.partida_id);
        await this.partidas.con(db).sumarPozo(pt.partida_id, -sala.costo_tabla);
      }
      await this.partidaTablas.con(db).borrar(partidaTablaId);
      return pt;
    });
    bus.emitir(sala_id, 'partida:tablas', { partida_id });
  }

  /** Frijolitos del jugador. Solo para restaurar su pantalla; no valida nada. */
  async marcar(partidaTablaId: string, marcas: number, actor: Actor) {
    const pt = await this.partidaTablas.marcar(partidaTablaId, actor.id, marcas);
    if (!pt) throw new NotFound();
    return pt;
  }
}
