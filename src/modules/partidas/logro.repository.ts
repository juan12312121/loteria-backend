import { BaseRepository } from '../../core/repository/BaseRepository';
import { Logro } from './logro.model';

export class LogroRepository extends BaseRepository<Logro> {
  previos(partidaId: string) {
    return this.filas<Pick<Logro, 'partida_tabla_id' | 'figura_id' | 'indice'>>(
      'SELECT partida_tabla_id, figura_id, indice FROM logros WHERE partida_id = $1',
      [partidaId],
    );
  }

  /** Registra el logro; false si esa tabla ya lo tenía (otro proceso llegó antes). */
  async registrar(l: Omit<Logro, 'id' | 'creado_en'>) {
    const n = await this.ejecutar(
      `INSERT INTO logros (partida_id, partida_tabla_id, usuario_id, figura_id, indice, mascara, puntos, primero)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (partida_tabla_id, figura_id) DO NOTHING`,
      [l.partida_id, l.partida_tabla_id, l.usuario_id, l.figura_id, l.indice, l.mascara, l.puntos, l.primero],
    );
    return n > 0;
  }

  dePartida(partidaId: string) {
    return this.filas(
      `SELECT l.usuario_id, u.nombre, l.partida_tabla_id, f.clave, f.nombre AS figura, l.indice AS carta, l.primero, l.puntos, l.mascara
       FROM logros l JOIN usuarios u ON u.id = l.usuario_id JOIN figuras f ON f.id = l.figura_id
       WHERE l.partida_id = $1 ORDER BY l.indice, l.creado_en`,
      [partidaId],
    );
  }
}
