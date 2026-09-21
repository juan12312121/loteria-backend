/**
 * Reglas de puntos (puras). Los puntos NO se apuestan: se ganan jugando
 * y se canjean por skins. Están pensadas para premiar jugar varias tablas.
 */
export const REGLAS_PUNTOS = {
  /** Por cada tabla jugada al terminar la partida, ganes o no */
  participacionPorTabla: 5,
  /** Al ganar, extra por cada tabla adicional a la primera */
  bonoPorTablaExtra: 3,
  /** Si ganas antes de esta carta, bono de rapidez */
  rapidezAntesDe: 30,
  rapidezBono: 20,
  /** +25 % por cada victoria seguida previa, hasta rachaMax */
  rachaPorcentaje: 25,
  rachaMax: 3,
} as const;

export interface EntradaVictoria {
  puntosFigura: number;
  /** Cuántas cartas se habían cantado al gritar */
  indice: number;
  /** Victorias seguidas ANTES de esta */
  racha: number;
  tablasJugadas: number;
}

export interface Desglose {
  figura: number;
  multiTabla: number;
  rapidez: number;
  racha: number;
  total: number;
}

export function puntosVictoria(e: EntradaVictoria): Desglose {
  const R = REGLAS_PUNTOS;
  const figura = e.puntosFigura;
  const multiTabla = Math.max(0, e.tablasJugadas - 1) * R.bonoPorTablaExtra;
  const rapidez = e.indice < R.rapidezAntesDe ? R.rapidezBono : 0;
  const base = figura + multiTabla + rapidez;
  const racha = Math.round((base * Math.min(e.racha, R.rachaMax) * R.rachaPorcentaje) / 100);
  return { figura, multiTabla, rapidez, racha, total: base + racha };
}

export function puntosParticipacion(tablasJugadas: number): number {
  return tablasJugadas * REGLAS_PUNTOS.participacionPorTabla;
}
