import { transaccion } from '../../db/pool';
import { BaseRepository } from '../../core/repository/BaseRepository';
import { coordenadas, mascaraCantadas, validarFigura } from '../../juego/MotorLoteria';
import { cantor } from '../../juego/Cantor';
import { bus } from '../../juego/bus';
import { Carta } from '../cartas/carta.model';
import { Figura } from '../figuras/figura.model';
import { FiguraRepository } from '../figuras/figura.repository';
import { Sala } from '../salas/sala.model';
import { SalaRepository } from '../salas/sala.repository';
import { FichasService } from '../movimientos/fichas.service';
import { PuntosService } from '../puntos/puntos.service';
import { Partida, TOTAL_CARTAS } from './partida.model';
import { TablaEnJuego } from './partida-tabla.model';
import { PartidaRepository } from './partida.repository';
import { PartidaTablaRepository } from './partida-tabla.repository';
import { LogroRepository } from './logro.repository';
import { GanadoresService, TablaGanadora } from './ganadores.service';

export interface CartaCantada {
  partida_id: string;
  orden: number;
  carta: Pick<Carta, 'id' | 'nombre' | 'verso' | 'imagen_url'>;
  quedan: number;
}

/** Foto de la ronda justo después de cantar una carta. */
interface Revision {
  partida: Partida;
  indice: number;
  tablas: TablaEnJuego[];
  cantadas: number[];
}

interface LogroNuevo {
  tabla: TablaEnJuego;
  figura: Figura;
  mascara: number;
  primero: boolean;
}

/**
 * El cantor y el tablero: saca cartas y, después de cada una, revisa TODAS
 * las tablas contra lo cantado. Anuncia las figuras intermedias y, si alguna
 * tabla completó la figura final, declara ¡Lotería! él solo. El jugador
 * nunca grita, así que no puede hacer trampa.
 */
export class CantorService {
  constructor(
    private readonly partidas: PartidaRepository,
    private readonly partidaTablas: PartidaTablaRepository,
    private readonly logros: LogroRepository,
    private readonly figuras: FiguraRepository,
    private readonly cartas: BaseRepository<Carta>,
    private readonly salas: SalaRepository,
    private readonly puntos: PuntosService,
    private readonly fichas: FichasService,
    private readonly ganadores: GanadoresService,
  ) {}

  /** En modo automático, un temporizador canta cada `velocidad_ms`. */
  programar(partida: Partida, sala: Sala) {
    if (sala.modo_cantor !== 'automatico') return;
    cantor.iniciar(partida.id, sala.velocidad_ms, async () => {
      const r = await this.cantarSiguiente(partida.id);
      return r !== null && r.quedan > 0;
    });
  }

  detener(partidaId: string) {
    cantor.detener(partidaId);
  }

  /** Devuelve la carta cantada, o null si la partida no está cantando. */
  async cantarSiguiente(partidaId: string): Promise<CartaCantada | null> {
    const avance = await this.partidas.avanzarIndice(partidaId);
    if (!avance) return null;
    const { sala_id, indice, carta_id } = avance;
    await this.partidas.registrarCantada(partidaId, indice, carta_id);
    const carta = await this.cartas.obtener(carta_id);
    const evento: CartaCantada = { partida_id: partidaId, orden: indice, carta: carta!, quedan: TOTAL_CARTAS - indice };
    bus.emitir(sala_id, 'carta:cantada', evento);

    const revision = await this.revisar(partidaId, indice);
    await this.anunciarLogros(sala_id, revision);
    const hubo = await this.declararSiHayGanador(revision);
    if (!hubo && indice >= TOTAL_CARTAS) await this.terminarSinGanador(partidaId, sala_id);
    return { ...evento, quedan: hubo ? 0 : evento.quedan };
  }

  private async revisar(partidaId: string, indice: number): Promise<Revision> {
    const [partida, tablas, cantadas] = await Promise.all([
      this.partidas.obtener(partidaId),
      this.partidaTablas.enJuego(partidaId),
      this.partidas.cartasCantadas(partidaId),
    ]);
    return { partida: partida!, indice, tablas, cantadas };
  }

  /** Tablas que completaron la figura final con lo cantado hasta ahora. */
  private async declararSiHayGanador({ partida, indice, tablas, cantadas }: Revision) {
    const figuraFinal = (await this.figuras.obtener(partida.figura_id))!;
    const ganadoras: TablaGanadora[] = [];
    for (const tabla of tablas) {
      const mascara = validarFigura(mascaraCantadas(tabla.cartas, cantadas), figuraFinal.mascaras);
      if (mascara !== null) ganadoras.push({ tabla, mascara });
    }
    if (!ganadoras.length) return false;
    this.detener(partida.id);
    await this.ganadores.declarar(partida.id, figuraFinal, indice, ganadoras);
    return true;
  }

  /**
   * Figuras intermedias (cuatro esquinas, La O…): se anuncian pero no terminan
   * la ronda. Cada figura se gana UNA vez por ronda: quien la hace primero se
   * la queda y los demás ya no pueden hacerla. Si varios la completan con la
   * misma carta, todos la ganan (llegaron al mismo tiempo).
   */
  private async anunciarLogros(salaId: string, revision: Revision) {
    const intermedias = await this.figuras.intermediasExcepto(revision.partida.figura_id);
    if (!intermedias.length) return;
    const nuevos = await this.buscarLogrosNuevos(revision, intermedias);
    if (!nuevos.length) return;
    const anuncios = await this.registrarLogros(revision.partida.id, revision.indice, nuevos);
    for (const a of anuncios) bus.emitir(salaId, 'figura:lograda', a);
  }

  private async buscarLogrosNuevos({ partida, indice, tablas, cantadas }: Revision, intermedias: Figura[]): Promise<LogroNuevo[]> {
    const previos = await this.logros.previos(partida.id);
    const yaTiene = new Set(previos.map((p) => `${p.partida_tabla_id}:${p.figura_id}`));
    // Figuras que alguien ya ganó en una carta anterior: quedan cerradas para todos
    const cerradas = new Set(previos.filter((p) => p.indice < indice).map((p) => p.figura_id));
    const abiertas = intermedias.filter((f) => !cerradas.has(f.id));
    const nuevos: LogroNuevo[] = [];
    for (const tabla of tablas) {
      const mascaraTabla = mascaraCantadas(tabla.cartas, cantadas);
      for (const figura of abiertas) {
        if (yaTiene.has(`${tabla.id}:${figura.id}`)) continue;
        const mascara = validarFigura(mascaraTabla, figura.mascaras);
        if (mascara !== null) nuevos.push({ tabla, figura, mascara, primero: true });
      }
    }
    return nuevos;
  }

  /** Guarda los logros y paga puntos una sola vez por jugador y figura. */
  private registrarLogros(partidaId: string, indice: number, nuevos: LogroNuevo[]) {
    return transaccion(async (db) => {
      const cobrados = new Set<string>();
      const anuncios = [];
      for (const { tabla, figura, mascara, primero } of nuevos) {
        const clave = `${tabla.usuario_id}:${figura.id}`;
        const puntos = primero && !cobrados.has(clave) ? figura.puntos : 0;
        const registrado = await this.logros.con(db).registrar({
          partida_id: partidaId, partida_tabla_id: tabla.id, usuario_id: tabla.usuario_id,
          figura_id: figura.id, indice, mascara, puntos, primero,
        });
        if (!registrado) continue;
        if (puntos > 0) {
          cobrados.add(clave);
          await this.puntos.mover(db, tabla.usuario_id, puntos, 'logro', partidaId, `Primero en hacer ${figura.nombre}`);
        }
        anuncios.push({
          partida_id: partidaId,
          usuario_id: tabla.usuario_id,
          nombre: tabla.nombre,
          partida_tabla_id: tabla.id,
          tabla: tabla.tabla,
          figura: { clave: figura.clave, nombre: figura.nombre },
          carta: indice,
          casillas: coordenadas(mascara, tabla.cartas),
          primero,
          puntos,
        });
      }
      return anuncios;
    });
  }

  /** Se acabó el mazo sin ganador (solo pasa si nadie tenía tablas): se regresan las apuestas. */
  private async terminarSinGanador(partidaId: string, salaId: string) {
    this.detener(partidaId);
    const terminada = await transaccion(async (db) => {
      const p = await this.partidas.con(db).cambiarEstado(partidaId, ['cantando'], 'terminada', 'terminada_en');
      if (!p) return null;
      await this.fichas.reembolsarApuestas(db, partidaId);
      await this.partidas.con(db).vaciarPozo(partidaId);
      await this.salas.con(db).liberar(salaId);
      await this.puntos.cerrarPartida(db, partidaId);
      return { ...p, pozo: 0 };
    });
    if (!terminada) return;
    bus.emitir(salaId, 'partida:estado', terminada);
    bus.emitir(salaId, 'partida:ganadores', { partida_id: partidaId, ganadores: [], motivo: 'Se acabó el mazo sin ganador' });
  }
}
