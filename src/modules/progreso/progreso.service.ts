import { Conflict, NotFound, Unprocessable } from '../../core/http/HttpError';
import { transaccion } from '../../db/pool';
import {
  diaLocal, lunesDe, MISIONES, Mision, periodoDe, PREMIOS_RANKING, puntosDiarios, rangoDe,
  RECOMPENSA_DIARIA, siguienteRacha, sumarDias,
} from '../../juego/Progreso';
import { BANCO, estadoNivel, nivelPase, NIVELES_PASE, PREMIOS_PASE, PUNTOS_POR_NIVEL_PASE, temporadaDe } from '../../juego/Niveles';
import { FichasService } from '../movimientos/fichas.service';
import { UsuarioRepository } from '../usuarios/usuario.repository';
import { PuntosService } from '../puntos/puntos.service';
import { SkinService } from '../skins/skin.service';
import { Metricas, ProgresoRepository } from './progreso.repository';

/** Último día del mes de una temporada 'YYYY-MM'. */
function finDeMes(temporada: string) {
  const [anio, mes] = temporada.split('-').map(Number);
  return new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
}

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
    private readonly fichas: FichasService,
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

  // ---------- niveles, pase y banco ----------

  /** Nivel e insignia del jugador (la experiencia son los puntos que ha ganado en su vida). */
  async nivel(usuarioId: string) {
    const [xp, usuario] = await Promise.all([this.progreso.experiencia(usuarioId), this.usuarios.obtener(usuarioId)]);
    return estadoNivel(xp, usuario?.nivel_cobrado ?? 0);
  }

  /** Cobra de un jalón los premios de los niveles que subió. */
  cobrarNivel(usuarioId: string) {
    return transaccion(async (db) => {
      const estado = await this.nivel(usuarioId);
      if (estado.porCobrar === 0) throw new Unprocessable('No tienes niveles nuevos por cobrar');
      if ((await this.usuarios.con(db).marcarNivelCobrado(usuarioId, estado.nivel)) === null)
        throw new Conflict('Ya cobraste esos niveles');
      const saldo = await this.puntos.mover(db, usuarioId, estado.premio, 'nivel', null, `Nivel ${estado.nivel}: ${estado.insignia.nombre}`);
      return { nivel: estado.nivel, insignia: estado.insignia, puntos: estado.premio, saldo };
    });
  }

  /** Pase del mes: gratis, se avanza con los puntos ganados jugando. */
  async pase(usuarioId: string) {
    const hoy = diaLocal();
    const temporada = temporadaDe(hoy);
    const [puntos, cobrados] = await Promise.all([
      this.progreso.puntosJugando(usuarioId, `${temporada}-01`, sumarDias(finDeMes(temporada), 1)),
      this.progreso.pasesCobrados(usuarioId, temporada),
    ]);
    const nivel = nivelPase(puntos);
    return {
      temporada,
      termina: finDeMes(temporada),
      puntos,
      nivel,
      niveles: NIVELES_PASE,
      por_nivel: PUNTOS_POR_NIVEL_PASE,
      premios: PREMIOS_PASE.map((p) => ({ ...p, alcanzado: p.nivel <= nivel, cobrado: cobrados.has(p.nivel) })),
      por_cobrar: PREMIOS_PASE.filter((p) => p.nivel <= nivel && !cobrados.has(p.nivel)).length,
    };
  }

  cobrarPase(usuarioId: string, nivel: number) {
    return transaccion(async (db) => {
      const pase = await this.pase(usuarioId);
      const premio = pase.premios.find((p) => p.nivel === nivel);
      if (!premio) throw new NotFound('Ese nivel del pase no existe');
      if (!premio.alcanzado) throw new Unprocessable(`Te faltan puntos: el nivel ${nivel} pide ${nivel * PUNTOS_POR_NIVEL_PASE}`);
      if (!(await this.progreso.con(db).cobrarPase(usuarioId, pase.temporada, nivel))) throw new Conflict('Ya cobraste ese nivel');
      if (premio.puntos) await this.puntos.mover(db, usuarioId, premio.puntos, 'pase', null, `Pase ${pase.temporada}, nivel ${nivel}`);
      if (premio.fichas) await this.fichas.mover(db, usuarioId, premio.fichas, 'bono', null);
      return { nivel, puntos: premio.puntos, fichas: premio.fichas, insignia: !!premio.insignia };
    });
  }

  /** Banco de fichas: un puñito gratis al día si te quedaste corto. */
  async banco(usuarioId: string) {
    const usuario = await this.usuarios.obtener(usuarioId);
    if (!usuario) throw new NotFound();
    const hoy = diaLocal();
    return {
      disponible: usuario.fichas < BANCO.siTienesMenosDe && usuario.ultimo_banco !== hoy,
      fichas: usuario.fichas,
      regala: BANCO.regala,
      minimo: BANCO.siTienesMenosDe,
    };
  }

  cobrarBanco(usuarioId: string) {
    return transaccion(async (db) => {
      if (!(await this.usuarios.con(db).apartarBanco(usuarioId, diaLocal(), BANCO.siTienesMenosDe)))
        throw new Unprocessable(`El banco presta una vez al día y solo si te quedan menos de ${BANCO.siTienesMenosDe} fichas`);
      const fichas = await this.fichas.mover(db, usuarioId, BANCO.regala, 'bono', null);
      return { fichas, regalo: BANCO.regala };
    });
  }

  /** Todo lo del lobby en una sola llamada. */
  async resumen(usuarioId: string) {
    const [diario, misiones, nivel, pase, banco] = await Promise.all([
      this.diario(usuarioId),
      this.misiones(usuarioId),
      this.nivel(usuarioId),
      this.pase(usuarioId),
      this.banco(usuarioId),
    ]);
    const porCobrar = misiones.filter((m) => m.completada && !m.cobrada).length + pase.por_cobrar + (nivel.porCobrar > 0 ? 1 : 0);
    return { diario, misiones, nivel, pase, banco, por_cobrar: porCobrar };
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
    const nivel = await this.nivel(usuarioId);
    return { ...stats, ...metricas, efectividad, nivel, carta_suerte: carta, figura_favorita: figura, historial, coleccion };
  }
}
