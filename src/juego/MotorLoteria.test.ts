import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barajar, generarTabla, tablaValida, mascaraCantadas, validarFigura, coordenadas, FIGURAS } from './MotorLoteria';

const fig = (clave: string) => FIGURAS.find((f) => f.clave === clave)!.mascaras;

test('barajar devuelve las 54 sin repetir', () => {
  const m = barajar();
  assert.equal(m.length, 54);
  assert.equal(new Set(m).size, 54);
});

test('generarTabla da 16 distintas', () => {
  assert.ok(tablaValida(generarTabla()));
  assert.ok(!tablaValida([1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]));
});

test('línea: primera fila', () => {
  const tabla = Array.from({ length: 16 }, (_, i) => i + 1);
  const m = mascaraCantadas(tabla, [1, 2, 3, 4, 40]);
  assert.equal(validarFigura(m, fig('linea')), 0b1111);
  assert.equal(validarFigura(m, fig('llena')), null);
});

test('cuatro esquinas', () => {
  const tabla = Array.from({ length: 16 }, (_, i) => i + 1);
  const m = mascaraCantadas(tabla, [1, 4, 13, 16]);
  assert.notEqual(validarFigura(m, fig('esquinas')), null);
  assert.equal(validarFigura(m, fig('centro')), null);
});

test('la O: las 12 del borde, sin las 4 del centro', () => {
  const tabla = Array.from({ length: 16 }, (_, i) => i + 1);
  const borde = [1, 2, 3, 4, 5, 8, 9, 12, 13, 14, 15, 16];
  assert.notEqual(validarFigura(mascaraCantadas(tabla, borde), fig('marco')), null);
  // Falta una casilla del borde (la 8) aunque estén las del centro: no gana
  assert.equal(validarFigura(mascaraCantadas(tabla, [...borde.filter((c) => c !== 8), 6, 7, 10, 11]), fig('marco')), null);
});

test('coordenadas de las cuatro esquinas', () => {
  const tabla = Array.from({ length: 16 }, (_, i) => i + 1);
  const m = validarFigura(mascaraCantadas(tabla, [1, 4, 13, 16]), fig('esquinas'))!;
  assert.deepEqual(coordenadas(m, tabla), [
    { fila: 0, col: 0, carta: 1 },
    { fila: 0, col: 3, carta: 4 },
    { fila: 3, col: 0, carta: 13 },
    { fila: 3, col: 3, carta: 16 },
  ]);
});

test('llena', () => {
  const tabla = Array.from({ length: 16 }, (_, i) => i + 1);
  assert.equal(validarFigura(mascaraCantadas(tabla, tabla), fig('llena')), 0xffff);
  assert.equal(validarFigura(mascaraCantadas(tabla, tabla.slice(1)), fig('llena')), null);
});
