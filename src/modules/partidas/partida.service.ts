import { Actor, BaseService } from '../../core/service/BaseService';
import { Conflict, Unprocessable } from '../../core/http/HttpError';
import { transaccion } from '../../db/pool';
import { barajar } from '../../juego/MotorLoteria';
import { bus } from '../../juego/bus';
import { SalaService } from '../salas/sala.service';
import { SalaRepository } from '../salas/sala.repository';
import { FiguraRepository } from '../figuras/figura.repository';
import { ReclamoRepository } from '../reclamos/reclamo.repository';
import { FichasService } from '../movimientos/fichas.service';
import { EstadoPartida, ESTADOS_EN_CURSO, Partida } from './partida.model';
import { PartidaRepository } from './partida.repository';
import { PartidaTablaRepository } from './partida-tabla.repository';
import { LogroRepository } from './logro.repository';
import { CantorService } from './cantor.service';
import type { BotsService } from '../salas/bots.service';
import type { AvisoService } from '../avisos/aviso.service';

/** Ciclo de vida de una ronda: crear, iniciar, pausar, reanudar, cancelar y consultar. */
export class PartidaService extends BaseService<Partida> {
  constructor(
    private readonly partidas: PartidaRepository,
    private readonly partidaTablas: PartidaTablaRepository,
    private readonly logros: LogroRepository,
    private readonly reclamos: ReclamoRepository,
    private readonly figuras: FiguraRepository,
    private readonly salaService: SalaService,
    private readonly salas: SalaRepository,
    private readonly cantor: CantorService,
    private readonly fichas: FichasService,
    private readonly bots: BotsService,
    private readonly avisos: AvisoService,
  ) {
    super(partidas);
  }

  // ---------- CRUD (ganchos) ----------

  /** Nueva ronda: solo el anfitrión, una a la vez por sala; el mazo se baraja y queda oculto. */
  protected async antesDeCrear(datos: Record<string, unknown>, actor?: Actor) {
    const sala = await this.salaService.exigirAnfitrion(String(datos.sala_id), actor!);
    if (sala.estado === 'cerrada') throw new Unprocessable('La sala está cerrada');
    if (await this.partidas.hayEnCurso(sala.id)) throw new Conflict('Ya hay una partida en curso en esta sala');
    return {
      sala_id: sala.id,
      numero: await this.partidas.siguienteNumero(sala.id),
      figura_id: datos.figura_id ?? sala.figura_id,
      mazo: barajar(),
    };
  }

  protected async despuesDeCrear(partida: Partida) {
    bus.emitir(partida.sala_id, 'partida:estado', partida);
    await this.bots.alCrearPartida(partida.id, partida.sala_id);
  }

  protected async antesDeActualizar(id: string, datos: Record<string, unknown>, actor?: Actor) {
    const { partida } = await this.deAnfitrion(id, actor!);
    if (partida.estado !== 'preparando') throw new Unprocessable('Solo se cambia la figura antes de iniciar');
    return datos;
  }

  protected async antesDeBorrar(partida: Partida, actor?: Actor) {
    await this.salaService.exigirAnfitrion(partida.sala_id, actor!);
    if (ESTADOS_EN_CURSO.includes(partida.estado)) throw new Unprocessable('Cancela la partida antes de borrarla');
  }

  // ---------- ciclo de vida ----------

  async iniciar(id: string, actor: Actor) {
    const { sala } = await this.deAnfitrion(id, actor);
    if ((await this.partidaTablas.contarEnPartida(id)) === 0) throw new Unprocessable('Nadie ha elegido tabla todavía');
    const partida = await this.cambiarEstado(id, ['preparando'], 'cantando', 'iniciada_en');
    await this.salas.marcarJugando(partida.sala_id);
    this.cantor.programar(partida, sala);
    void this.avisos.rondaIniciada(sala.id, sala.nombre, actor.id);
    return partida;
  }

  async pausar(id: string, actor: Actor) {
    await this.deAnfitrion(id, actor);
    this.cantor.detener(id);
    return this.cambiarEstado(id, ['cantando'], 'pausada');
  }

  async reanudar(id: string, actor: Actor) {
    const { sala } = await this.deAnfitrion(id, actor);
    const partida = await this.cambiarEstado(id, ['pausada'], 'cantando');
    this.cantor.programar(partida, sala);
    return partida;
  }

  /** Cancela y regresa lo apostado. */
  async cancelar(id: string, actor: Actor) {
    await this.deAnfitrion(id, actor);
    this.cantor.detener(id);
    const partida = await transaccion(async (db) => {
      const p = await this.partidas.con(db).cambiarEstado(id, ESTADOS_EN_CURSO, 'cancelada', 'terminada_en');
      if (!p) throw new Unprocessable('La partida ya terminó');
      await this.fichas.reembolsarApuestas(db, id);
      await this.partidas.con(db).vaciarPozo(id);
      await this.salas.con(db).liberar(p.sala_id);
      return { ...p, pozo: 0 };
    });
    bus.emitir(partida.sala_id, 'partida:estado', partida);
    return partida;
  }

  /** Modo manual: el anfitrión canta. En automático sirve para adelantar. */
  async cantar(id: string, actor: Actor) {
    await this.deAnfitrion(id, actor);
    const carta = await this.cantor.cantarSiguiente(id);
    if (!carta) throw new Unprocessable('La partida no está cantando o ya se acabó el mazo');
    return carta;
  }

  // ---------- consulta ----------

  /** Todo lo que el cliente necesita para dibujar la ronda. Nunca incluye el mazo. */
  async estado(id: string, actor: Actor) {
    const partida = await this.obtener(id);
    await this.salaService.exigirMiembro(partida.sala_id, actor.id);
    const [figuraFinal, cantadas, misTablas, tablasOcupadas, logros, ganadores] = await Promise.all([
      this.figuras.obtener(partida.figura_id),
      this.partidas.cantadasDetalle(id),
      this.partidaTablas.misTablas(id, actor.id),
      this.partidaTablas.ocupadas(id),
      this.logros.dePartida(id),
      this.reclamos.ganadores(id),
    ]);
    return { partida, figuraFinal, cantadas, misTablas, tablasOcupadas, logros, ganadores };
  }

  // ---------- ayudantes ----------

  private async deAnfitrion(id: string, actor: Actor) {
    const partida = await this.obtener(id);
    const sala = await this.salaService.exigirAnfitrion(partida.sala_id, actor);
    return { partida, sala };
  }

  private async cambiarEstado(id: string, de: EstadoPartida[], a: EstadoPartida, marca?: 'iniciada_en' | 'terminada_en') {
    const partida = await this.partidas.cambiarEstado(id, de, a, marca);
    if (!partida) throw new Unprocessable(`La partida no está en estado ${de.join('/')}`);
    bus.emitir(partida.sala_id, 'partida:estado', partida);
    return partida;
  }
}
