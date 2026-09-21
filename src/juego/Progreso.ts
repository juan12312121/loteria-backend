/**
 * Reglas puras de progreso: recompensa diaria, misiones, ranking semanal,
 * temporadas, frases del chat rápido y bots. Nada de base de datos aquí.
 */

export const ZONA_HORARIA = 'America/Mexico_City';

// ---------- recompensa diaria ----------

/** Puntos por día seguido (el día 7 en adelante paga lo máximo). */
export const RECOMPENSA_DIARIA = [10, 15, 20, 25, 30, 40, 60] as const;

export function puntosDiarios(diasSeguidos: number): number {
  const i = Math.min(Math.max(diasSeguidos, 1), RECOMPENSA_DIARIA.length) - 1;
  return RECOMPENSA_DIARIA[i];
}

/** Días seguidos después de reclamar hoy, según el último día que reclamó. */
export function siguienteRacha(ultimo: string | null, hoy: string, diasSeguidos: number): number {
  if (!ultimo) return 1;
  const dias = Math.round((Date.parse(hoy) - Date.parse(ultimo)) / 86_400_000);
  if (dias <= 0) return diasSeguidos;
  return dias === 1 ? diasSeguidos + 1 : 1;
}

// ---------- misiones ----------

export type Periodo = 'diaria' | 'semanal' | 'siempre';
/** Qué se cuenta para avanzar la misión (lo calcula el repositorio). */
export type Metrica = 'partidas' | 'victorias' | 'logros' | 'victorias_multitabla' | 'victorias_rapidas' | 'tablas';

export interface Mision {
  clave: string;
  periodo: Periodo;
  titulo: string;
  metrica: Metrica;
  meta: number;
  puntos: number;
  /** Clave de skin exclusiva que se regala al cobrarla */
  skin?: string;
}

export const MISIONES: Mision[] = [
  { clave: 'd_jugar', periodo: 'diaria', titulo: 'Juega 3 partidas', metrica: 'partidas', meta: 3, puntos: 30 },
  { clave: 'd_ganar', periodo: 'diaria', titulo: 'Gana una partida', metrica: 'victorias', meta: 1, puntos: 50 },
  { clave: 'd_figura', periodo: 'diaria', titulo: 'Haz cuatro esquinas o La O', metrica: 'logros', meta: 1, puntos: 30 },
  { clave: 'd_tablas', periodo: 'diaria', titulo: 'Juega 8 tablas en total', metrica: 'tablas', meta: 8, puntos: 25 },
  { clave: 's_jugar', periodo: 'semanal', titulo: 'Juega 15 partidas', metrica: 'partidas', meta: 15, puntos: 150 },
  { clave: 's_ganar', periodo: 'semanal', titulo: 'Gana 5 partidas', metrica: 'victorias', meta: 5, puntos: 250 },
  { clave: 's_multi', periodo: 'semanal', titulo: 'Gana con tabla llena jugando 3 tablas o más', metrica: 'victorias_multitabla', meta: 1, puntos: 200 },
  { clave: 's_rapida', periodo: 'semanal', titulo: 'Gana antes de la carta 30', metrica: 'victorias_rapidas', meta: 1, puntos: 200 },
  { clave: 'x_ganar10', periodo: 'siempre', titulo: 'Gana 10 partidas', metrica: 'victorias', meta: 10, puntos: 100, skin: 'sol_azteca' },
  { clave: 'x_figuras25', periodo: 'siempre', titulo: 'Logra 25 figuras', metrica: 'logros', meta: 25, puntos: 100, skin: 'av_cantor' },
];

// ---------- fechas (en hora de México) ----------

/** 'YYYY-MM-DD' de una fecha en la zona horaria del juego. */
export function diaLocal(fecha = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);
}

/** Lunes (YYYY-MM-DD) de la semana de un día. */
export function lunesDe(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`);
  const desdeLunes = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - desdeLunes);
  return d.toISOString().slice(0, 10);
}

export function sumarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Identificador del periodo de una misión para un día dado. */
export function periodoDe(periodo: Periodo, dia: string): string {
  if (periodo === 'diaria') return dia;
  if (periodo === 'semanal') return `s${lunesDe(dia)}`;
  return 'siempre';
}

/** Rango [desde, hasta) en días locales; null = desde siempre. */
export function rangoDe(periodo: Periodo, dia: string): { desde: string | null; hasta: string } {
  if (periodo === 'diaria') return { desde: dia, hasta: sumarDias(dia, 1) };
  if (periodo === 'semanal') {
    const lunes = lunesDe(dia);
    return { desde: lunes, hasta: sumarDias(lunes, 7) };
  }
  return { desde: null, hasta: sumarDias(dia, 1) };
}

// ---------- temporadas ----------

/** ¿La skin está a la venta hoy? Sin temporada = siempre. 'MM-DD'; si inicio > fin, cruza el año. */
export function enTemporada(inicio: string | null, fin: string | null, dia: string): boolean {
  if (!inicio || !fin) return true;
  const hoy = dia.slice(5);
  return inicio <= fin ? hoy >= inicio && hoy <= fin : hoy >= inicio || hoy <= fin;
}

// ---------- ranking semanal ----------

/** Premio por lugar al cerrar la semana (1.º también se lleva la skin exclusiva). */
export const PREMIOS_RANKING = [
  { lugar: 1, puntos: 500, skin: 'corona_oro' },
  { lugar: 2, puntos: 300 },
  { lugar: 3, puntos: 150 },
] as const;

// ---------- chat rápido ----------

/** Frases fijas: sin texto libre, no hay nada que moderar. */
export const FRASES = {
  casi: '¡Ya casi!',
  corre: '¡Corre y se va corriendo!',
  falto: '¡Me faltó una!',
  suerte: '¡Suerte a todos!',
  bien: '¡Bien jugado!',
  otra: '¡Otra ronda!',
  ay: '¡Ay, nanita!',
  jaja: '¡Jajaja!',
} as const;

export type ClaveFrase = keyof typeof FRASES;
export const esFrase = (clave: unknown): clave is ClaveFrase => typeof clave === 'string' && clave in FRASES;

// ---------- bots ----------

export const BOTS = [
  { nombre: 'Doña Cuca', avatar: 'av_catrina' },
  { nombre: 'Don Chuy', avatar: 'av_charro' },
  { nombre: 'La Güera', avatar: 'av_ajolote' },
  { nombre: 'El Profe', avatar: 'av_xolo' },
  { nombre: 'Tía Lencha', avatar: 'av_monarca' },
  { nombre: 'Compadre Beto', avatar: 'av_luchador' },
  { nombre: 'Panchito', avatar: 'av_jaguar' },
  { nombre: 'Abuelita Toña', avatar: 'av_gallo' },
] as const;

/** Cuántas tablas juega un bot (1 a 3). */
export const TABLAS_POR_BOT = { min: 1, max: 3 } as const;
