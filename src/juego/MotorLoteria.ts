import { randomInt } from 'node:crypto';

/**
 * Reglas puras de la Lotería. Nada de base de datos ni HTTP aquí.
 * Una tabla es 4x4; la casilla (fila, col) es el bit  fila*4 + col.
 */
export const TOTAL_CARTAS = 54;
export const CASILLAS = 16;

/** Reglas iguales para todas las salas (no las configura el anfitrión). */
export const REGLAS_SALA = {
  /** Cada jugador escoge cuántas tablas juega, hasta este tope para que alcancen para todos */
  maxTablasPorJugador: 6,
  /** Fichas que cuesta cada tabla; van al pozo */
  costoTabla: 10,
} as const;

const bit = (fila: number, col: number) => 1 << (fila * 4 + col);
const filas = [0, 1, 2, 3].map((f) => [0, 1, 2, 3].reduce((m, c) => m | bit(f, c), 0));
const columnas = [0, 1, 2, 3].map((c) => [0, 1, 2, 3].reduce((m, f) => m | bit(f, c), 0));
const diagonales = [
  [0, 1, 2, 3].reduce((m, i) => m | bit(i, i), 0),
  [0, 1, 2, 3].reduce((m, i) => m | bit(i, 3 - i), 0),
];
const cuadritos: number[] = [];
for (let f = 0; f < 3; f++)
  for (let c = 0; c < 3; c++) cuadritos.push(bit(f, c) | bit(f, c + 1) | bit(f + 1, c) | bit(f + 1, c + 1));

export interface FiguraDef {
  clave: string;
  nombre: string;
  mascaras: number[];
  descripcion: string;
  /** Se anuncia pero no termina la ronda */
  intermedia?: boolean;
}

export const FIGURAS: FiguraDef[] = [
  { clave: 'llena', nombre: 'Tabla llena', mascaras: [0xffff], descripcion: 'Las 16 casillas' },
  { clave: 'linea', nombre: 'Línea', mascaras: [...filas, ...columnas, ...diagonales], descripcion: 'Fila, columna o diagonal' },
  { clave: 'esquinas', nombre: 'Cuatro esquinas', mascaras: [bit(0, 0) | bit(0, 3) | bit(3, 0) | bit(3, 3)], descripcion: 'Las 4 esquinas', intermedia: true },
  { clave: 'centro', nombre: 'Centrito', mascaras: [bit(1, 1) | bit(1, 2) | bit(2, 1) | bit(2, 2)], descripcion: 'Las 4 del centro' },
  { clave: 'marco', nombre: 'La O', mascaras: [0xffff & ~(bit(1, 1) | bit(1, 2) | bit(2, 1) | bit(2, 2))], descripcion: 'Las 12 casillas del borde, forman una O', intermedia: true },
  { clave: 'cuadrito', nombre: 'Cuadrito', mascaras: cuadritos, descripcion: 'Cualquier bloque 2x2' },
];

/** Fisher-Yates con aleatoriedad criptográfica. */
export function barajar(n = TOTAL_CARTAS): number[] {
  const mazo = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = mazo.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
  }
  return mazo;
}

/** 16 cartas distintas para una tabla. */
export function generarTabla(): number[] {
  return barajar().slice(0, CASILLAS);
}

export function tablaValida(cartas: number[]): boolean {
  return (
    cartas.length === CASILLAS &&
    new Set(cartas).size === CASILLAS &&
    cartas.every((c) => Number.isInteger(c) && c >= 1 && c <= TOTAL_CARTAS)
  );
}

/** Máscara de las casillas de la tabla cuya carta ya se cantó. */
export function mascaraCantadas(cartasTabla: number[], cantadas: Iterable<number>): number {
  const set = new Set(cantadas);
  let m = 0;
  cartasTabla.forEach((carta, i) => {
    if (set.has(carta)) m |= 1 << i;
  });
  return m;
}

/** Devuelve la máscara de la figura que se cumple, o null si ninguna. */
export function validarFigura(mascaraTabla: number, mascarasFigura: number[]): number | null {
  for (const m of mascarasFigura) if ((mascaraTabla & m) === m) return m;
  return null;
}

/**
 * Convierte una máscara en coordenadas de la tabla: fila y columna (0–3)
 * y la carta que hay en esa casilla. Sirve para que el cliente resalte
 * exactamente las casillas con las que se ganó.
 */
export function coordenadas(mascara: number, cartasTabla: number[]) {
  const r: { fila: number; col: number; carta: number }[] = [];
  for (let i = 0; i < CASILLAS; i++) if (mascara & (1 << i)) r.push({ fila: Math.floor(i / 4), col: i % 4, carta: cartasTabla[i] });
  return r;
}

/** Código de sala: 6 letras/números sin los que se confunden (0/O, 1/I). */
export function codigoSala(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += abc[randomInt(abc.length)];
  return s;
}
