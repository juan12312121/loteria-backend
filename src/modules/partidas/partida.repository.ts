import { BaseRepository } from '../../core/repository/BaseRepository';
import { EstadoPartida, ESTADOS_EN_CURSO, Partida, TOTAL_CARTAS } from './partida.model';

/** Lo que el lock de un grito necesita saber de la partida. */
export interface PartidaBloqueada {
  id: string;
  sala_id: string;
  figura_id: number;
  indice: number;
  pozo: number;
  estado: EstadoPartida;
}

export class PartidaRepository extends BaseRepository<Partida> {
  async hayEnCurso(salaId: string) {
    return (await this.ejecutar('SELECT 1 FROM partidas WHERE sala_id = $1 AND estado = ANY($2)', [salaId, ESTADOS_EN_CURSO])) > 0;
  }

  async siguienteNumero(salaId: string) {
    const r = await this.fila<{ n: number }>('SELECT coalesce(max(numero), 0) + 1 AS n FROM partidas WHERE sala_id = $1', [salaId]);
    return r!.n;
  }

  /** Cambia de estado solo si está en uno de los esperados (evita carreras). */
  cambiarEstado(id: string, de: EstadoPartida[], a: EstadoPartida, marca?: 'iniciada_en' | 'terminada_en') {
    const extra = marca ? `, ${marca} = coalesce(${marca}, now())` : '';
    return this.fila<Partida>(
      `UPDATE partidas SET estado = $2 ${extra} WHERE id = $1 AND estado = ANY($3) RETURNING ${this.model.select()}`,
      [id, a, de],
    );
  }

  /**
   * Saca la siguiente carta del mazo de forma atómica: aunque lleguen dos
   * peticiones a la vez, cada carta se canta una sola vez.
   */
  avanzarIndice(id: string) {
    return this.fila<{ sala_id: string; indice: number; carta_id: number }>(
      `UPDATE partidas SET indice = indice + 1
       WHERE id = $1 AND estado = 'cantando' AND indice < ${TOTAL_CARTAS}
       RETURNING sala_id, indice, mazo[indice] AS carta_id`,
      [id],
    );
  }

  registrarCantada(partidaId: string, orden: number, cartaId: number) {
    return this.ejecutar('INSERT INTO cantadas (partida_id, orden, carta_id) VALUES ($1,$2,$3)', [partidaId, orden, cartaId]);
  }

  async cartasCantadas(partidaId: string): Promise<number[]> {
    const r = await this.filas<{ carta_id: number }>('SELECT carta_id FROM cantadas WHERE partida_id = $1', [partidaId]);
    return r.map((x) => x.carta_id);
  }

  cantadasDetalle(partidaId: string) {
    return this.filas(
      `SELECT c.orden, ca.id, ca.nombre, ca.verso, ca.imagen_url, c.cantada_en
       FROM cantadas c JOIN cartas ca ON ca.id = c.carta_id WHERE c.partida_id = $1 ORDER BY c.orden`,
      [partidaId],
    );
  }

  /** Bloquea la fila (FOR UPDATE) para validar un grito sin carreras. */
  bloquear(id: string) {
    return this.fila<PartidaBloqueada>(
      'SELECT id, sala_id, figura_id, indice, pozo, estado FROM partidas WHERE id = $1 FOR UPDATE',
      [id],
    );
  }

  sumarPozo(id: string, monto: number) {
    return this.ejecutar('UPDATE partidas SET pozo = pozo + $2 WHERE id = $1', [id, monto]);
  }

  vaciarPozo(id: string) {
    return this.ejecutar('UPDATE partidas SET pozo = 0 WHERE id = $1', [id]);
  }

  /** Marca que ya se repartieron los puntos de participación; false si ya estaba. */
  async marcarPuntosOtorgados(id: string) {
    return (await this.ejecutar('UPDATE partidas SET puntos_otorgados = true WHERE id = $1 AND NOT puntos_otorgados', [id])) > 0;
  }
}
