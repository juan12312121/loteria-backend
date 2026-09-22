import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoNivel, insigniaDe, nivelDe, nivelPase, NIVEL_MAXIMO, PREMIOS_PASE, temporadaDe, xpParaNivel } from './Niveles';

test('el nivel sube con la experiencia y se topa en el máximo', () => {
  assert.equal(nivelDe(0), 1);
  assert.equal(nivelDe(xpParaNivel(2)), 2);
  assert.equal(nivelDe(xpParaNivel(2) - 1), 1);
  assert.equal(nivelDe(xpParaNivel(10)), 10);
  assert.equal(nivelDe(99_999_999), NIVEL_MAXIMO);
});

test('cada tramo de niveles tiene su insignia', () => {
  assert.equal(insigniaDe(1).clave, 'novato');
  assert.equal(insigniaDe(9).clave, 'frijolito');
  assert.equal(insigniaDe(50).clave, 'leyenda');
});

test('los premios de nivel se acumulan hasta cobrarlos', () => {
  const sinCobrar = estadoNivel(xpParaNivel(4), 1);
  assert.equal(sinCobrar.nivel, 4);
  assert.equal(sinCobrar.porCobrar, 3);
  assert.ok(sinCobrar.premio > 0);
  const alDia = estadoNivel(xpParaNivel(4), 4);
  assert.equal(alDia.porCobrar, 0);
  assert.equal(alDia.premio, 0);
});

test('el pase avanza con los puntos del mes y tiene 10 niveles', () => {
  assert.equal(nivelPase(0), 0);
  assert.equal(nivelPase(150), 1);
  assert.equal(nivelPase(1499), 9);
  assert.equal(nivelPase(999_999), 10);
  assert.equal(PREMIOS_PASE.length, 10);
  assert.ok(PREMIOS_PASE.every((p) => p.puntos > 0 || p.fichas > 0));
  assert.ok(PREMIOS_PASE.at(-1)!.insignia);
  assert.equal(temporadaDe('2026-09-22'), '2026-09');
});
