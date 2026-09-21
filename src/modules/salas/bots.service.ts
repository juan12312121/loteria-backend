import { randomInt } from 'node:crypto';
import { Actor } from '../../core/service/BaseService';
import { Conflict, NotFound, Unprocessable } from '../../core/http/HttpError';
import { bus } from '../../juego/bus';
import { TABLAS_POR_BOT } from '../../juego/Progreso';
import { UsuarioRepository } from '../usuarios/usuario.repository';
import { PartidaRepository } from '../partidas/partida.repository';
import { PartidaTablaRepository } from '../partidas/partida-tabla.repository';
import { TablasPartidaService } from '../partidas/tablas-partida.service';
import { SalaRepository } from './sala.repository';
import { SalaService } from './sala.service';

/**
 * Bots para completar la sala. Juegan como cualquiera: eligen tablas (pagan su
 * costo al pozo) y el tablero los revisa igual; no necesitan marcar porque
 * el servidor valida por coordenadas.
 */
export class BotsService {
  constructor(
    private readonly salas: SalaRepository,
    private readonly salaService: SalaService,
    private readonly usuarios: UsuarioRepository,
    private readonly partidas: PartidaRepository,
    private readonly partidaTablas: PartidaTablaRepository,
    private readonly tablasPartida: TablasPartidaService,
  ) {}

  async agregar(salaId: string, actor: Actor) {
    const sala = await this.salaService.exigirAnfitrion(salaId, actor);
    if (sala.estado !== 'abierta') throw new Unprocessable('Agrega bots cuando no haya una ronda cantándose');
    if ((await this.salas.contarJugadores(salaId)) >= sala.max_jugadores) throw new Conflict('La sala está llena');
    const [bot] = await this.usuarios.botsLibres(salaId);
    if (!bot) throw new Conflict('Ya no quedan bots libres');
    await this.salas.agregarJugador(salaId, bot.id);
    bus.emitir(salaId, 'jugador:entro', { id: bot.id, nombre: bot.nombre, bot: true });
    const enPreparacion = await this.partidas.enPreparacion(salaId);
    if (enPreparacion) await this.elegirTablas(enPreparacion.id, bot.id);
    return bot;
  }

  async quitar(salaId: string, botId: string, actor: Actor) {
    const sala = await this.salaService.exigirAnfitrion(salaId, actor);
    if (sala.estado !== 'abierta') throw new Unprocessable('No se puede quitar un bot a media ronda');
    const bot = await this.usuarios.obtener(botId);
    if (bot?.rol !== 'bot' || !(await this.salas.esMiembro(salaId, botId))) throw new NotFound('Ese bot no está en la sala');
    const enPreparacion = await this.partidas.enPreparacion(salaId);
    if (enPreparacion) {
      const suyas = await this.partidaTablas.misTablas(enPreparacion.id, botId);
      for (const t of suyas) await this.tablasPartida.soltar(t.id, { id: botId, rol: 'bot' });
    }
    await this.salas.quitarJugador(salaId, botId);
    bus.emitir(salaId, 'jugador:salio', { id: botId });
  }

  /** Al abrir una ronda, cada bot de la sala escoge sus tablas. */
  async alCrearPartida(partidaId: string, salaId: string) {
    for (const botId of await this.salas.botsDe(salaId)) await this.elegirTablas(partidaId, botId);
  }

  private async elegirTablas(partidaId: string, botId: string) {
    const cuantas = randomInt(TABLAS_POR_BOT.min, TABLAS_POR_BOT.max + 1);
    const libres = await this.partidaTablas.tablasLibres(partidaId, cuantas);
    for (const tablaId of libres) {
      try {
        await this.tablasPartida.elegir(partidaId, tablaId, { id: botId, rol: 'bot' });
      } catch {
        // Otra persona la tomó justo antes: el bot juega con las que alcanzó
      }
    }
  }
}
