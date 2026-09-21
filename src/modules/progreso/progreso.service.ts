import { Conflict, NotFound, Unprocessable } from '../../core/http/HttpError';
import { transaccion } from '../../db/pool';
import {
  diaLocal, lunesDe, MISIONES, Mision, periodoDe, PREMIOS_RANKING, puntosDiarios, rangoDe,
  RECOMPENSA_DIARIA, siguienteRacha, sumarDias,
} from '../../juego/Progreso';
import { UsuarioRepository } from '../usuarios/usuario.repository';
import { PuntosService } from '../puntos/puntos.service';
import { SkinService } from '../skins/skin.service';
import { Metricas, ProgresoRepository } from './progreso.repository';

export interface EstadoMision extends Mision {
  periodo_id: string;
  progreso: number;
  completada: boolean;
  cobrada: boolean;
}

/**
 * Lo que hace volver al jugador: recompensa diaria, misiones, ranking semanal
 * y su perfil con estadísticas.
 */
export class ProgresoService {
  constructor(
    private readonly progreso: ProgresoRepository,
    private readonly usuarios: UsuarioRepository,
    private readonly puntos: PuntosService,
    private readonly skins: SkinService,
  ) {}

  // ---------- recompensa diaria ----------

  async diario(usuarioId: string) {
    const usuario = await this.usuarios.obtener(usuarioId);
    if (!usuario) throw new NotFound();
    const hoy = diaLocal();
    const ultimo = usuario.ultimo_diario;
    const disponible = ultimo !== hoy;
    const dias = disponible ? siguienteRacha(ultimo, hoy, usuario.dias_seguidos) : usuario.dias_seguidos;
    return { disponible, dias_seguidos: dias, puntos: puntosDiarios(dias), escala: RECOMPENSA_DIARIA };
  }

  reclamarDiario(usuarioId: string) {
    return transaccion(async (db) => {
      const usuario = await this.usuarios.con(db).obtener(usuarioId);
      if (!usuario) throw new NotFound();
      const hoy = diaLocal();
      const ultimo = usuario.ultimo_diario;
      const dias = siguienteRacha(ultimo, hoy, usuario.dias_seguidos);
      if ((await this.usuarios.con(db).registrarDiario(usuarioId, hoy, dias)) === null)
        throw new Conflict('Ya cobraste tu recompensa de hoy; vuelve mañana');
      const puntos = puntosDiarios(dias);
      const saldo = await this.puntos.mover(db, usuarioId, puntos, 'diario', null, `Día ${dias} seguido`);
      return { dias_seguidos: dias, puntos, saldo };
    });
  }

  // ---------- misiones ----------

  async misiones(usuarioId: string): Promise<EstadoMision[]> {
    const hoy = diaLocal();
    const periodos = ['diaria', 'semanal', 'siempre'] as const;
    const metricas = Object.fromEntries(
      await Promise.all(
        periodos.map(async (p) => {
          const { desde, hasta } = rangoDe(p, hoy);
          return [p, await this.progreso.metricas(usuarioId, desde, hasta)] as const;
        }),
      ),
    ) as Record<(typeof periodos)[number], Metricas>;
    const ids = periodos.map((p) => periodoDe(p, hoy));
    const cobradas = await this.progreso.cobradas(usuarioId, ids);
    return MISIONES.map((m) => {
      const periodo_id = periodoDe(m.periodo, hoy);
      const progreso = Math.min(m.meta, metricas[m.periodo][m.metrica]);
      return { ...m, periodo_id, progreso, completada: progreso >= m.meta, cobrada: cobradas.has(`${m.clave}:${periodo_id}`) };
    });
  }

  async cobrarMision(usuarioId: string, clave: string) {
    const mision = (await this.misiones(usuarioId)).find((m) => m.clave === clave);
    if (!mision) throw new NotFound('Esa misión no existe');
    if (!mision.completada) throw new Unprocessable(`Te falta: llevas ${mision.progreso} de ${mision.meta}`);
    return transaccion(async (db) => {
      if (!(await this.progreso.con(db).cobrar(usuarioId, clave, mision.periodo_id))) throw new Conflict('Ya cobraste esta misión');
      const saldo = await this.puntos.mover(db, usuarioId, mision.puntos, 'mision', null, mision.titulo);
      const skin = mision.skin ? await this.skins.regalar(db, usuarioId, mision.skin) : null;
      return { puntos: mision.puntos, saldo, skin };
    });
  }

  /** Todo lo del lobby en una sola llamada. */
  async resumen(usuarioId: string) {
    const [diario, misiones] = await Promise.all([this.diario(usuarioId), this.misiones(usuarioId)]);
    return { diario, misiones, por_cobrar: misiones.filter((m) => m.completada && !m.cobrada).length };
  }

  // ---------- ranking semanal ----------

  async rankingSemanal(limite = 20) {
    const hoy = diaLocal();
    const lunes = lunesDe(hoy);
    const [filas, anterior] = await Promise.all([
      this.progreso.rankingSemana(lunes, sumarDias(lunes, 7), Math.min(100, Math.max(1, limite))),
      this.progreso.ultimaSemanaPremiada(),
    ]);
    return { semana: lunes, cierra: sumarDias(lunes, 7), premios: PREMIOS_RANKING, filas, anterior };
  }

  /**
   * Premia la semana pasada si nadie lo ha hecho. Es idempotente (la semana se
   * reserva en la misma transacción), así que se puede llamar cada hora.
   */
  async premiarSemanaPasada() {
    const semana = sumarDias(lunesDe(diaLocal()), -7);
    return transaccion(async (db) => {
      const repo = this.progreso.con(db);
      if (!(await repo.reservarSemana(semana))) return null;
      const top = await repo.rankingSemana(semana, sumarDias(semana, 7), PREMIOS_RANKING.length);
      const ganadores = [];
      for (const [i, fila] of top.entries()) {
        const premio = PREMIOS_RANKING[i];
        await this.puntos.mover(db, fila.usuario_id, premio.puntos, 'ranking', null, `Lugar ${premio.lugar} de la semana ${semana}`);
        if ('skin' in premio) await this.skins.regalar(db, fila.usuario_id, premio.skin);
        ganadores.push({ ...fila, lugar: premio.lugar, premio: premio.puntos });
      }
      await repo.guardarGanadoresSemana(semana, ganadores);
      return { semana, ganadores };
    });
  }

  // ---------- perfil ----------

  async perfil(usuarioId: string) {
    const [stats, carta, figura, historial, metricas, coleccion] = await Promise.all([
      this.progreso.estadisticas(usuarioId),
      this.progreso.cartaDeLaSuerte(usuarioId),
      this.progreso.figuraFavorita(usuarioId),
      this.progreso.historial(usuarioId),
      this.progreso.metricas(usuarioId, null, sumarDias(diaLocal(), 1)),
      this.skins.coleccion(usuarioId),
    ]);
    if (!stats) throw new NotFound('Jugador no encontrado');
    const efectividad = metricas.partidas ? Math.round((metricas.victorias / metricas.partidas) * 100) : 0;
    return { ...stats, ...metricas, efectividad, carta_suerte: carta, figura_favorita: figura, historial, coleccion };
  }
}
