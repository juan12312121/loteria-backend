import { test } from 'node:test';
import assert from 'node:assert/strict';
import { puntosVictoria, puntosParticipacion } from './Puntos';

test('victoria simple: solo figura', () => {
  const d = puntosVictoria({ puntosFigura: 30, indice: 40, racha: 0, tablasJugadas: 1 });
  assert.deepEqual(d, { figura: 30, multiTabla: 0, rapidez: 0, racha: 0, total: 30 });
});

test('3 tablas, rápida, racha de 2', () => {
  const d = puntosVictoria({ puntosFigura: 30, indice: 20, racha: 2, tablasJugadas: 3 });
  // base = 30 + 6 + 20 = 56; racha = 56 * 50% = 28
  assert.equal(d.multiTabla, 6);
  assert.equal(d.rapidez, 20);
  assert.equal(d.racha, 28);
  assert.equal(d.total, 84);
});

test('racha se topa en 3', () => {
  const a = puntosVictoria({ puntosFigura: 100, indice: 50, racha: 3, tablasJugadas: 1 });
  const b = puntosVictoria({ puntosFigura: 100, indice: 50, racha: 9, tablasJugadas: 1 });
  assert.equal(a.total, b.total);
});

test('participación por tabla', () => {
  assert.equal(puntosParticipacion(4), 20);
});
