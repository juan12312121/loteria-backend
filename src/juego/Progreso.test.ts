import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enTemporada, lunesDe, periodoDe, puntosDiarios, rangoDe, siguienteRacha } from './Progreso';

test('recompensa diaria crece hasta el día 7 y se queda ahí', () => {
  assert.equal(puntosDiarios(1), 10);
  assert.equal(puntosDiarios(7), 60);
  assert.equal(puntosDiarios(30), 60);
});

test('racha diaria: sigue si reclamó ayer, se reinicia si faltó', () => {
  assert.equal(siguienteRacha(null, '2026-09-21', 0), 1);
  assert.equal(siguienteRacha('2026-09-20', '2026-09-21', 4), 5);
  assert.equal(siguienteRacha('2026-09-18', '2026-09-21', 4), 1);
  assert.equal(siguienteRacha('2026-09-21', '2026-09-21', 4), 4);
});

test('semanas empiezan en lunes', () => {
  assert.equal(lunesDe('2026-09-21'), '2026-09-21'); // lunes
  assert.equal(lunesDe('2026-09-27'), '2026-09-21'); // domingo
  assert.equal(periodoDe('semanal', '2026-09-24'), 's2026-09-21');
  assert.deepEqual(rangoDe('semanal', '2026-09-24'), { desde: '2026-09-21', hasta: '2026-09-28' });
});

test('temporadas, incluida la que cruza el año', () => {
  assert.ok(enTemporada(null, null, '2026-03-01'));
  assert.ok(enTemporada('09-01', '09-30', '2026-09-21'));
  assert.ok(!enTemporada('09-01', '09-30', '2026-10-01'));
  assert.ok(enTemporada('12-01', '01-06', '2026-12-24'));
  assert.ok(enTemporada('12-01', '01-06', '2027-01-03'));
  assert.ok(!enTemporada('12-01', '01-06', '2027-02-01'));
});
