import { transaccion } from '../../db/pool';
import { coordenadas } from '../../juego/MotorLoteria';
import { bus } from '../../juego/bus';
import { Figura } from '../figuras/figura.model';
import { SalaRepository } from '../salas/sala.repository';
import { ReclamoRepository } from '../reclamos/reclamo.repository';
import { FichasService } from '../movimientos/fichas.service';
import { PuntosService } from '../puntos/puntos.service';
import { TablaEnJuego } from './partida-tabla.model';
import { PartidaRepository } from './partida.repository';

export interface TablaGanadora {
  tabla: TablaEnJuego;
  mascara: number;
}

/**
 * Cierra la ronda cuando el tablero detecta que una o más tablas completaron
 * la figura final. Nadie grita: el servidor decide, así que no hay trampa
 * posible. Empate (varias tablas en la misma carta): se reparte el pozo.
 */
export class GanadoresService {
  constructor(
    private readonly partidas: PartidaRepository,
    private readonly reclamos: ReclamoRepository,
    private readonly salas: SalaRepository,
    private readonly fichas: FichasService,
    private readonly puntos: PuntosService,
  ) {}

  async declarar(partidaId: string, figura: Figura, indice: number, ganadoras: TablaGanadora[]) {
    const resultado = await transaccion(async (db) => {
      // Solo una llamada puede cerrar la ronda (si otra ya lo hizo, no hace nada)
      const terminada = await this.partidas.con(db).cambiarEstado(partidaId, ['cantando'], 'terminada', 'terminada_en');
      if (!terminada) return null;
      await this.salas.con(db).liberar(terminada.sala_id);

      const porJugador = unaPorJugador(ganadoras);
      const premio = Math.floor(terminada.pozo / porJugador.length);
      const ganadores = [];
      for (const { tabla, mascara } of porJugador) {
        await this.reclamos.con(db).crear({
          partida_id: partidaId, partida_tabla_id: tabla.id, usuario_id: tabla.usuario_id,
          indice_al_gritar: indice, valido: true, mascara_ganadora: mascara, premio,
          motivo: '¡Lotería! la anunció el tablero',
        });
        if (premio > 0) await this.fichas.mover(db, tabla.usuario_id, premio, 'premio', partidaId);
        const puntos = await this.puntos.premiarGanador(db, partidaId, tabla.usuario_id, figura.puntos, indice);
        ganadores.push({
          usuario_id: tabla.usuario_id,
          nombre: tabla.nombre,
          premio,
          tabla: tabla.tabla,
          casillas: coordenadas(mascara, tabla.cartas),
          puntos,
        });
      }
      await this.puntos.cerrarPartida(db, partidaId);
      return { terminada, ganadores };
    });

    if (!resultado) return null;
    const { terminada, ganadores } = resultado;
    bus.emitir(terminada.sala_id, 'partida:estado', terminada);
    bus.emitir(terminada.sala_id, 'partida:ganadores', { partida_id: partidaId, figura: figura.nombre, carta: indice, ganadores });
    return ganadores;
  }
}

/** Un premio por jugador aunque llene varias tablas en la misma carta. */
function unaPorJugador(ganadoras: TablaGanadora[]) {
  const vistos = new Set<string>();
  return ganadoras.filter((g) => !vistos.has(g.tabla.usuario_id) && vistos.add(g.tabla.usuario_id));
}
