import { BaseRepository } from '../../core/repository/BaseRepository';
import { Figura } from './figura.model';

export class FiguraRepository extends BaseRepository<Figura> {
  porClave(clave: string) {
    return this.buscarUno({ clave });
  }

  /** Figuras que se anuncian durante la ronda, sin contar la que la termina. */
  intermediasExcepto(figuraFinalId: number) {
    return this.filas<Figura>(
      `SELECT ${this.model.select()} FROM figuras WHERE intermedia AND id <> $1 ORDER BY id`,
      [figuraFinalId],
    );
  }
}
