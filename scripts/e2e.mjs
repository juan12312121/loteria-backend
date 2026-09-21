// Prueba de punta a punta contra un servidor corriendo (npm run dev).
// Uso: API_URL=http://localhost:3000 npm run e2e
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';

const API = process.env.API_URL ?? 'http://localhost:3000';
const sufijo = Date.now();
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(metodo, ruta, { body, token, status } = {}) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = r.status === 204 ? { ok: true } : await r.json();
  if (status) {
    assert.equal(r.status, status, `${metodo} ${ruta}: esperaba ${status}, llegó ${r.status}`);
    return json;
  }
  if (!json.ok) throw new Error(`${metodo} ${ruta} -> ${r.status} ${JSON.stringify(json.error)}`);
  return json.data;
}

const paso = (msg) => console.log('  ✓', msg);

async function registrar(nombre) {
  return api('POST', '/auth/registro', { body: { nombre, correo: `${nombre.toLowerCase()}${sufijo}@test.mx`, password: 'secreto1' } });
}

/** El anfitrión canta hasta que el tablero cierre la ronda solo. */
async function cantarHastaQueTermine(partidaId, anfitrion) {
  for (let i = 0; i < 54; i++) {
    const r = await fetch(`${API}/partidas/${partidaId}/cantar`, { method: 'POST', headers: { authorization: `Bearer ${anfitrion.token}` } });
    if (r.status === 422) break; // ya no está cantando: el tablero la cerró
  }
  return api('GET', `/partidas/${partidaId}/estado`, { token: anfitrion.token });
}

console.log('Lotería e2e contra', API);

// --- errores estándar ---
const e404 = await api('GET', '/no-existe', { status: 404 });
assert.equal(e404.error.codigo, 'RUTA_NO_ENCONTRADA');
const e400 = await api('POST', '/auth/registro', { body: { nombre: 'x' }, status: 400 });
assert.equal(e400.error.codigo, 'PETICION_INVALIDA');
await api('GET', '/auth/yo', { status: 401 });
paso('errores 404 / 400 / 401 con formato estándar');

// --- cuentas y sala ---
const rosa = await registrar('Rosa');
const tono = await registrar('Tono');
const login = await api('POST', '/auth/login', { body: { correo: `rosa${sufijo}@test.mx`, password: 'secreto1' } });
assert.ok(login.token);
assert.equal(login.usuario.password_hash, undefined);
paso('registro y login (sin exponer el hash)');

const figuras = await api('GET', '/figuras');
const sala = await api('POST', '/salas', { token: rosa.token, body: { nombre: 'E2E', modo_cantor: 'manual', costo_tabla: 10 } });
assert.equal(figuras.find((f) => f.id === sala.figura_id).clave, 'llena');
await api('POST', `/salas/unirse/${sala.codigo}`, { token: tono.token });
const jugadores = await api('GET', `/salas/${sala.id}/jugadores`, { token: tono.token });
assert.equal(jugadores.length, 2);
paso(`sala ${sala.codigo} con tabla llena por defecto y 2 jugadores`);

// --- tiempo real ---
const socket = io(API, { auth: { token: tono.token } });
const eventos = [];
for (const ev of ['carta:cantada', 'figura:lograda', 'partida:ganadores']) socket.on(ev, (d) => eventos.push({ ev, d }));
await new Promise((r) => socket.on('connect', r));
socket.emit('sala:unirse', sala.id);
await esperar(300);

// --- ronda 1: el tablero anuncia figuras y declara la lotería solo ---
const partida = await api('POST', '/partidas', { token: rosa.token, body: { sala_id: sala.id } });
assert.equal(partida.mazo, undefined);
const tablas = await api('GET', '/tablas?oficial=true&porPagina=6');
for (const t of tablas.slice(0, 2)) await api('POST', `/partidas/${partida.id}/tablas`, { token: rosa.token, body: { tabla_id: t.id } });
await api('POST', `/partidas/${partida.id}/tablas`, { token: tono.token, body: { tabla_id: tablas[3].id } });
await api('POST', `/partidas/${partida.id}/tablas`, { token: tono.token, body: { tabla_id: tablas[0].id }, status: 409 });
assert.equal((await api('GET', `/partidas/${partida.id}`, { token: rosa.token })).pozo, 30);
paso('mazo oculto, tabla repetida rechazada (409), pozo 30');

await api('POST', `/partidas/${partida.id}/iniciar`, { token: rosa.token });
const sinGrito = await api('POST', `/partidas/${partida.id}/loteria`, { token: tono.token, body: {}, status: 404 });
assert.equal(sinGrito.error.codigo, 'RUTA_NO_ENCONTRADA');
paso('el jugador no puede gritar lotería: no existe la ruta (404)');

const fin = await cantarHastaQueTermine(partida.id, rosa);
assert.equal(fin.partida.estado, 'terminada');
const carta = fin.cantadas.length;
await esperar(400);
const anuncio = eventos.find((e) => e.ev === 'partida:ganadores')?.d;
assert.ok(anuncio, 'el tablero debe anunciar ganadores');
const cantadasIds = new Set(fin.cantadas.map((c) => c.id));
for (const g of anuncio.ganadores) {
  assert.equal(g.casillas.length, 16);
  assert.ok(g.casillas.every((c) => cantadasIds.has(c.carta)), 'la tabla ganadora debe estar llena de cartas cantadas');
  assert.ok(g.puntos.total >= 100);
}
const pozoRepartido = anuncio.ganadores.reduce((t, g) => t + g.premio, 0);
assert.ok(pozoRepartido > 0 && pozoRepartido <= 30);
const ganador = anuncio.ganadores[0].usuario_id === rosa.usuario.id ? rosa : tono;
paso(`el tablero declaró ¡Lotería! en la carta ${carta}: ${anuncio.ganadores.map((g) => `${g.nombre} +${g.premio} fichas +${g.puntos.total} pts`).join(', ')}`);

const cantadasEnVivo = eventos.filter((e) => e.ev === 'carta:cantada').length;
const logros = eventos.filter((e) => e.ev === 'figura:lograda');
assert.equal(cantadasEnVivo, carta);
assert.ok(logros.every((l) => l.d.figura.clave !== 'llena'));
paso(`en vivo: ${cantadasEnVivo} cartas, ${logros.length} avisos de figura, ganadores`);

// --- puntos, skins y fichas ---
const yo = await api('GET', '/auth/yo', { token: rosa.token });
assert.ok(yo.puntos > 0 && yo.equipo);
const catalogo = await api('GET', '/skins/catalogo?tipo=ficha', { token: rosa.token });
const alcanza = [...catalogo].reverse().find((s) => s.precio_puntos > 0 && s.precio_puntos <= yo.puntos);
if (alcanza) {
  const canje = await api('POST', `/skins/${alcanza.id}/canjear`, { token: rosa.token });
  assert.equal(canje.puntos_restantes, yo.puntos - alcanza.precio_puntos);
  await api('POST', `/skins/${alcanza.id}/canjear`, { token: rosa.token, status: 409 });
  const equipo = await api('POST', `/skins/${alcanza.id}/equipar`, { token: rosa.token });
  assert.equal(equipo.ficha.id, alcanza.id);
  paso(`canjeó y equipó ${alcanza.nombre}`);
}
const movs = await api('GET', '/movimientos/mios', { token: ganador.token });
assert.ok(movs.some((m) => m.tipo === 'premio') && movs.some((m) => m.tipo === 'apuesta'));
paso('bitácora de fichas del ganador: apuestas y premio');

// --- ronda 2: cancelar reembolsa ---
const p2 = await api('POST', '/partidas', { token: rosa.token, body: { sala_id: sala.id } });
await api('POST', `/partidas/${p2.id}/tablas`, { token: tono.token, body: { tabla_id: tablas[4].id } });
const antes = (await api('GET', '/auth/yo', { token: tono.token })).fichas;
await api('POST', `/partidas/${p2.id}/cancelar`, { token: rosa.token });
assert.equal((await api('GET', '/auth/yo', { token: tono.token })).fichas, antes + 10);
await api('POST', `/partidas/${p2.id}/iniciar`, { token: tono.token, status: 403 });
paso('cancelar reembolsa y solo el anfitrión controla la ronda (403)');

// --- recompensa diaria ---
const resumen = await api('GET', '/progreso', { token: tono.token });
assert.equal(resumen.diario.disponible, true);
const diario = await api('POST', '/progreso/diario', { token: tono.token });
assert.equal(diario.puntos, 10);
await api('POST', '/progreso/diario', { token: tono.token, status: 409 });
assert.equal((await api('GET', '/progreso', { token: tono.token })).diario.disponible, false);
paso('recompensa diaria: +10 el día 1 y no se cobra dos veces (409)');

// --- misiones ---
const misiones = (await api('GET', '/progreso', { token: ganador.token })).misiones;
const ganarHoy = misiones.find((m) => m.clave === 'd_ganar');
assert.ok(ganarHoy.completada && !ganarHoy.cobrada);
assert.equal(misiones.find((m) => m.clave === 'd_jugar').progreso, 1);
const cobro = await api('POST', '/progreso/misiones/d_ganar/cobrar', { token: ganador.token });
assert.equal(cobro.puntos, ganarHoy.puntos);
await api('POST', '/progreso/misiones/d_ganar/cobrar', { token: ganador.token, status: 409 });
await api('POST', '/progreso/misiones/s_ganar/cobrar', { token: ganador.token, status: 422 });
paso(`misiones: "${ganarHoy.titulo}" cobrada una sola vez; incompleta rechazada (422)`);

// --- ranking semanal y perfil ---
const ranking = await api('GET', '/progreso/ranking', { token: rosa.token });
assert.ok(ranking.filas.some((f) => f.usuario_id === ganador.usuario.id && f.puntos > 0));
assert.ok(ranking.filas.every((f) => !f.nombre.includes('bot')));
const perfil = await api('GET', '/progreso/perfil', { token: ganador.token });
assert.equal(perfil.partidas, 1);
assert.equal(perfil.victorias, 1);
assert.equal(perfil.efectividad, 100);
assert.ok(perfil.carta_suerte?.nombre && perfil.historial[0].gano);
const perfilAjeno = await api('GET', `/progreso/perfil/${rosa.usuario.id}`, { token: tono.token });
assert.equal(perfilAjeno.correo, undefined);
paso(`ranking semanal y perfil (carta de la suerte: ${perfil.carta_suerte.nombre})`);

// --- skins: tipos nuevos, temporada y exclusivas ---
const avatares = await api('GET', '/skins/catalogo?tipo=avatar', { token: rosa.token });
const exclusiva = avatares.find((s) => s.exclusiva);
assert.ok(exclusiva && !exclusiva.disponible);
await api('POST', `/skins/${exclusiva.id}/canjear`, { token: rosa.token, status: 422 });
const fichasCat = await api('GET', '/skins/catalogo?tipo=ficha', { token: rosa.token });
const deTemporada = fichasCat.filter((s) => s.temporada_inicio);
const fuera = deTemporada.find((s) => !s.disponible);
if (fuera) await api('POST', `/skins/${fuera.id}/canjear`, { token: rosa.token, status: 422 });
const coleccion = await api('GET', '/skins/coleccion', { token: rosa.token });
assert.deepEqual(coleccion.map((c) => c.tipo).sort(), ['avatar', 'carta', 'ficha', 'fondo']);
paso(`avatares y fondos; exclusiva y fuera de temporada no se venden (${deTemporada.filter((s) => s.disponible).length} de temporada a la venta hoy)`);

// --- salas públicas ---
const publica = await api('POST', '/salas', { token: rosa.token, body: { nombre: `Pública ${sufijo}` } });
const publicas = await api('GET', '/salas/publicas', { token: tono.token });
const vista = publicas.find((s) => s.id === publica.id);
assert.ok(vista && vista.anfitrion === 'Rosa' && vista.jugadores === 1 && !vista.soy_miembro);
paso('salas públicas con anfitrión y ocupación');

// --- chat rápido ---
const frases = [];
socket.on('sala:frase', (d) => frases.push(d));
socket.emit('sala:frase', { salaId: sala.id, clave: 'casi' });
socket.emit('sala:frase', { salaId: sala.id, clave: 'texto libre malicioso' });
await esperar(400);
assert.equal(frases.length, 1);
assert.equal(frases[0].clave, 'casi');
paso('chat rápido: solo frases fijas');

// --- bots ---
const bot1 = await api('POST', `/salas/${sala.id}/bots`, { token: rosa.token });
await api('POST', `/salas/${sala.id}/bots`, { token: rosa.token });
await api('POST', `/salas/${sala.id}/bots`, { token: tono.token, status: 403 });
const conBots = await api('GET', `/salas/${sala.id}/jugadores`, { token: rosa.token });
assert.equal(conBots.filter((j) => j.bot).length, 2);
assert.ok(conBots.find((j) => j.bot).avatar);
await api('POST', '/auth/login', { body: { correo: 'bot1@bots.loteria', password: '!' }, status: 401 });
const p3 = await api('POST', '/partidas', { token: rosa.token, body: { sala_id: sala.id } });
await api('POST', `/partidas/${p3.id}/tablas`, { token: tono.token, body: { tabla_id: tablas[5].id } });
const est3 = await api('GET', `/partidas/${p3.id}/estado`, { token: rosa.token });
const tablasDeBots = est3.tablasOcupadas.filter((t) => t.bot);
assert.ok(tablasDeBots.length >= 2, 'cada bot escoge al menos una tabla');
await api('POST', `/partidas/${p3.id}/iniciar`, { token: rosa.token });
await api('DELETE', `/salas/${sala.id}/bots/${bot1.id}`, { token: rosa.token, status: 422 });
const fin3 = await cantarHastaQueTermine(p3.id, rosa);
assert.equal(fin3.partida.estado, 'terminada');
assert.ok(fin3.ganadores.length >= 1);
await api('DELETE', `/salas/${sala.id}/bots/${bot1.id}`, { token: rosa.token, status: 204 });
paso(`bots: juegan ${tablasDeBots.length} tablas y el tablero los revisa igual; ganó ${fin3.ganadores.map((g) => g.nombre).join(', ')}`);

socket.close();
console.log('Todo bien ✔');
