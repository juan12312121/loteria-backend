/**
 * Reglas puras de niveles, pase de temporada y banco de fichas.
 * La experiencia son los puntos que has ganado en toda tu vida de jugador
 * (no bajan al canjear skins), así que el nivel nunca retrocede.
 */

// ---------- niveles ----------

/** Cada nivel cuesta un poco más que el anterior. */
const XP_BASE = 120;
export const NIVEL_MAXIMO = 50;

export const xpParaNivel = (nivel: number) => Math.round(XP_BASE * ((nivel - 1) * nivel) / 2);

export function nivelDe(xp: number): number {
  let nivel = 1;
  while (nivel < NIVEL_MAXIMO && xp >= xpParaNivel(nivel + 1)) nivel++;
  return nivel;
}

/** Insignia que se ve junto al nombre, según el nivel. */
export const INSIGNIAS = [
  { desde: 1, clave: 'novato', nombre: 'Novato', emoji: '🌱' },
  { desde: 5, clave: 'frijolito', nombre: 'Frijolito', emoji: '🫘' },
  { desde: 10, clave: 'buenas', nombre: 'De buenas', emoji: '🍀' },
  { desde: 16, clave: 'cantor', nombre: 'Cantor', emoji: '📣' },
  { desde: 23, clave: 'charro', nombre: 'Charro', emoji: '🤠' },
  { desde: 31, clave: 'catrin', nombre: 'Catrín', emoji: '🎩' },
  { desde: 40, clave: 'leyenda', nombre: 'Leyenda', emoji: '👑' },
] as const;

export const insigniaDe = (nivel: number) => [...INSIGNIAS].reverse().find((i) => nivel >= i.desde) ?? INSIGNIAS[0];

/** Puntos de regalo al subir de nivel. */
export const premioDeNivel = (nivel: number) => 20 + nivel * 5;

export interface EstadoNivel {
  nivel: number;
  insignia: (typeof INSIGNIAS)[number];
  xp: number;
  xpNivel: number;
  xpSiguiente: number;
  /** Niveles subidos cuyo premio no se ha cobrado */
  porCobrar: number;
  premio: number;
}

export function estadoNivel(xp: number, nivelCobrado: number): EstadoNivel {
  const nivel = nivelDe(xp);
  const porCobrar = Math.max(0, nivel - Math.max(1, nivelCobrado));
  let premio = 0;
  for (let n = Math.max(1, nivelCobrado) + 1; n <= nivel; n++) premio += premioDeNivel(n);
  return {
    nivel,
    insignia: insigniaDe(nivel),
    xp,
    xpNivel: xpParaNivel(nivel),
    xpSiguiente: nivel >= NIVEL_MAXIMO ? xpParaNivel(NIVEL_MAXIMO) : xpParaNivel(nivel + 1),
    porCobrar,
    premio,
  };
}

// ---------- pase de temporada ----------

/** Cada mes es una temporada nueva y gratis: se avanza con los puntos ganados jugando. */
export const NIVELES_PASE = 10;
export const PUNTOS_POR_NIVEL_PASE = 150;

export interface PremioPase {
  nivel: number;
  puntos: number;
  fichas: number;
  /** Solo el último nivel: insignia del mes */
  insignia?: boolean;
}

export const PREMIOS_PASE: PremioPase[] = Array.from({ length: NIVELES_PASE }, (_, i) => {
  const nivel = i + 1;
  return {
    nivel,
    puntos: nivel % 2 === 1 ? 40 + nivel * 10 : 0,
    fichas: nivel % 2 === 0 ? 30 + nivel * 5 : 0,
    ...(nivel === NIVELES_PASE ? { insignia: true } : {}),
  };
});

/** 'YYYY-MM' del día dado (la temporada del pase). */
export const temporadaDe = (dia: string) => dia.slice(0, 7);

export const nivelPase = (puntosDelMes: number) => Math.min(NIVELES_PASE, Math.floor(puntosDelMes / PUNTOS_POR_NIVEL_PASE));

// ---------- banco de fichas ----------

/** Si te quedaste casi sin fichas, el banco te presta un puñito una vez al día. */
export const BANCO = { siTienesMenosDe: 30, regala: 50 } as const;
