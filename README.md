# Lotería API

Backend de Lotería mexicana: Express + TypeScript + Postgres (Supabase) + Socket.IO.
Varias salas juegan al mismo tiempo, cada una con sus propias partidas.

## Arrancar

```bash
npm install
cp .env.example .env      # llena DB_* y JWT_SECRET
npm run db:migrate        # crea las tablas
npm run db:seed           # 54 cartas, 6 figuras, 20 tablas oficiales
npm run dev
```

`npm test` corre las pruebas del motor (barajar, tablas, figuras).

## Flujo de una partida

1. `POST /auth/registro` → token.
2. Anfitrión: `POST /salas` → devuelve `codigo` (6 letras) para invitar.
3. Invitados: `POST /salas/unirse/:codigo`.
4. Todos: socket `sala:unirse` con el id de la sala para recibir eventos.
5. Anfitrión: `POST /partidas { sala_id }` → nueva ronda (mazo barajado y oculto).
6. Jugadores: `POST /partidas/:id/tablas { tabla_id }`. Cada quien escoge cuántas (tope general 6); cada tabla cuesta 10 fichas fijas que van al pozo.
7. Anfitrión: `POST /partidas/:id/iniciar`. En modo `automatico` el servidor canta solo cada `velocidad_ms`; en `manual` usa `POST /partidas/:id/cantar`.
8. Jugador (opcional): `PATCH /partida-tablas/:id/marcas { marcas }` para sus frijolitos (bits 0–15, solo visual).
9. **Nadie grita.** Después de cada carta el tablero revisa todas las tablas contra lo cantado: anuncia las figuras
   intermedias (`figura:lograda`) y, si alguna tabla completó la figura final, declara ¡Lotería! solo
   (`partida:ganadores`), termina la ronda y reparte el pozo (empates en la misma carta lo dividen).
10. Cualquiera: `GET /partidas/:id/estado`.

Reglas fijas del juego (no las configura el anfitrión): `juego/MotorLoteria.ts → REGLAS_SALA`.

## Endpoints

| Ruta | Quién |
|---|---|
| `POST /auth/registro` · `POST /auth/login` · `GET /auth/yo` | público / token |
| `GET /cartas` · `GET /figuras` (CRUD completo admin) | público |
| `GET,POST /tablas` · `PATCH,DELETE /tablas/:id` | token (oficiales solo admin) |
| `GET /salas` · `GET /salas/mias` · `POST /salas` · `PATCH,DELETE /salas/:id` | token |
| `POST /salas/unirse/:codigo` · `POST /salas/:id/salir` · `GET /salas/:id/jugadores` | token |
| `POST /partidas` · `GET /partidas?sala_id=` · `GET /partidas/:id/estado` | token |
| `POST /partidas/:id/iniciar,pausar,reanudar,cancelar,cantar` | anfitrión |
| `POST /partidas/:id/tablas` | jugador |
| `PATCH /partida-tablas/:id/marcas` · `DELETE /partida-tablas/:id` | dueño |
| `GET /reclamos?partida_id=` | token |
| `GET /movimientos/mios` · `GET /movimientos` (admin) | token |
| `GET /usuarios` … (admin) | admin |

Listados: `?pagina=1&porPagina=20&orden=-creado_en&estado=abierta`.

Respuesta: `{ ok: true, data, meta? }` o `{ ok: false, error: { codigo, mensaje, detalles } }`.

## Puntos y skins

Los **puntos** no se apuestan: se ganan jugando y se canjean por skins. Reglas en `juego/Puntos.ts` (`GET /puntos/reglas`):

| Cuándo | Puntos |
|---|---|
| Termina la partida (ganes o no) | **5 por cada tabla jugada** |
| Ganas | puntos de la figura (línea 30, esquinas/centro 25, cuadrito 20, marco 70, llena 100) |
| Ganas con varias tablas | +3 por cada tabla extra |
| Ganas antes de la carta 30 | +20 |
| Racha (victorias seguidas) | +25 % por cada una, tope 3 (+75 %) |
| Primero en hacer una figura intermedia | sus puntos (esquinas 25, La O 70) |

| Ruta | Qué hace |
|---|---|
| `GET /skins/catalogo?tipo=ficha` | catálogo con `la_tengo` y `equipada` |
| `GET /skins/mias` | las que ya canjeé |
| `POST /skins/:id/canjear` | compra con puntos (las de precio 0 son gratis) |
| `POST /skins/:id/equipar` · `DELETE /skins/equipo/:tipo` | ponérsela / quitársela; aplica a todas mis tablas |
| `GET /puntos/mios` · `GET /puntos/ranking` | bitácora y tabla de líderes |
| `GET /auth/yo` | incluye `puntos`, `racha` y `equipo { ficha, carta }` |

`GET /partidas/:id/estado` → `tablasOcupadas[]` trae `skin_ficha` y `skin_carta` de cada rival para dibujarlos.

## Eventos Socket.IO (handshake `auth.token`)

Cliente emite `sala:unirse(salaId)` / `sala:salir(salaId)`.
Servidor emite en el cuarto de la sala: `jugador:entro`, `jugador:salio`, `jugador:conectado`, `jugador:desconectado`,
`partida:estado`, `partida:tablas`, `carta:cantada`, `figura:lograda`, `partida:ganadores`.

## Figuras (máscaras de 16 bits, bit = fila*4 + col)

llena, linea (4 filas + 4 columnas + 2 diagonales), esquinas, centro, marco, cuadrito (9 bloques 2×2).

## Arquitectura

Capas, de afuera hacia adentro:

```
routes  →  controller  →  service  →  repository  →  Postgres
(URL +     (lee req,      (reglas de   (todo el SQL,
 auth +     responde con   negocio y    parametrizado)
 zod)       ApiResponse)   transacción)
```

- `core/`: las bases reutilizables — `BaseModel` (columnas, ocultas, filtrables, esquemas zod),
  `BaseRepository` (CRUD + `filas/fila/ejecutar`), `BaseService` (CRUD con ganchos), `BaseController`
  (list/get/create/update/remove/listMios), `crudRoutes()` y `catalogoRoutes()`.
- `modules/<recurso>/`: `x.model.ts`, `x.repository.ts`, `x.service.ts`, `x.controller.ts`, `x.routes.ts`.
  Partidas se divide en servicios de una sola responsabilidad: `partida.service` (ciclo de vida),
  `cantor.service` (cantar y revisar el tablero tras cada carta), `tablas-partida.service` (elegir/soltar/marcar) y
  `ganadores.service` (el tablero declara ¡Lotería! y reparte el pozo).
- `container.ts`: raíz de composición; el único lugar donde se crean instancias e inyectan dependencias.
- `juego/`: reglas puras (`MotorLoteria`, `Puntos`) con pruebas, `Cantor` (timers), `bus` y `realtime` (Socket.IO).

`npm test` corre las pruebas de reglas; `npm run e2e` juega una partida completa contra el servidor.
