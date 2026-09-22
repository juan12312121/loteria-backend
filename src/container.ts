/**
 * Raíz de composición: aquí (y solo aquí) se crean repositorios, servicios y
 * controladores y se inyectan sus dependencias. Ningún módulo importa
 * instancias de otro; reciben lo que necesitan por constructor.
 */
import { BaseRepository } from './core/repository/BaseRepository';
import { BaseService } from './core/service/BaseService';
import { BaseController } from './core/controller/BaseController';
import { catalogoRoutes } from './core/routes/catalogo';

import { usuarioModel } from './modules/usuarios/usuario.model';
import { UsuarioRepository } from './modules/usuarios/usuario.repository';
import { usuarioRoutes } from './modules/usuarios/usuario.routes';
import { cartaModel, Carta } from './modules/cartas/carta.model';
import { figuraModel } from './modules/figuras/figura.model';
import { FiguraRepository } from './modules/figuras/figura.repository';
import { tablaModel, Tabla } from './modules/tablas/tabla.model';
import { TablaService } from './modules/tablas/tabla.service';
import { tablaRoutes } from './modules/tablas/tabla.routes';
import { movimientoModel } from './modules/movimientos/movimiento.model';
import { MovimientoRepository } from './modules/movimientos/movimiento.repository';
import { FichasService } from './modules/movimientos/fichas.service';
import { movimientoRoutes } from './modules/movimientos/movimiento.routes';
import { puntosModel, PuntosMovimiento } from './modules/puntos/puntos.model';
import { PuntosService } from './modules/puntos/puntos.service';
import { PuntosController } from './modules/puntos/puntos.controller';
import { puntosRoutes } from './modules/puntos/puntos.routes';
import { skinModel } from './modules/skins/skin.model';
import { SkinRepository } from './modules/skins/skin.repository';
import { SkinService } from './modules/skins/skin.service';
import { SkinController } from './modules/skins/skin.controller';
import { skinRoutes } from './modules/skins/skin.routes';
import { salaModel } from './modules/salas/sala.model';
import { SalaRepository } from './modules/salas/sala.repository';
import { SalaService } from './modules/salas/sala.service';
import { SalaController } from './modules/salas/sala.controller';
import { salaRoutes } from './modules/salas/sala.routes';
import { BotsService } from './modules/salas/bots.service';
import { ProgresoRepository } from './modules/progreso/progreso.repository';
import { ProgresoService } from './modules/progreso/progreso.service';
import { ProgresoController } from './modules/progreso/progreso.controller';
import { progresoRoutes } from './modules/progreso/progreso.routes';
import { AmigoRepository } from './modules/amigos/amigo.repository';
import { AmigoService } from './modules/amigos/amigo.service';
import { AmigoController } from './modules/amigos/amigo.controller';
import { amigoRoutes } from './modules/amigos/amigo.routes';
import { AvisoRepository } from './modules/avisos/aviso.repository';
import { AvisoService } from './modules/avisos/aviso.service';
import { avisoRoutes } from './modules/avisos/aviso.routes';
import { reclamoModel } from './modules/reclamos/reclamo.model';
import { ReclamoRepository } from './modules/reclamos/reclamo.repository';
import { reclamoRoutes } from './modules/reclamos/reclamo.routes';
import { partidaModel } from './modules/partidas/partida.model';
import { partidaTablaModel } from './modules/partidas/partida-tabla.model';
import { logroModel } from './modules/partidas/logro.model';
import { PartidaRepository } from './modules/partidas/partida.repository';
import { PartidaTablaRepository } from './modules/partidas/partida-tabla.repository';
import { LogroRepository } from './modules/partidas/logro.repository';
import { CantorService } from './modules/partidas/cantor.service';
import { PartidaService } from './modules/partidas/partida.service';
import { TablasPartidaService } from './modules/partidas/tablas-partida.service';
import { GanadoresService } from './modules/partidas/ganadores.service';
import { PartidaController } from './modules/partidas/partida.controller';
import { partidaRoutes, partidaTablaRoutes } from './modules/partidas/partida.routes';
import { AuthService } from './modules/auth/auth.service';
import { AuthController } from './modules/auth/auth.controller';
import { authRoutes } from './modules/auth/auth.routes';

// ---------- repositorios ----------
const usuarioRepo = new UsuarioRepository(usuarioModel);
const cartaRepo = new BaseRepository<Carta>(cartaModel);
const figuraRepo = new FiguraRepository(figuraModel);
const tablaRepo = new BaseRepository<Tabla>(tablaModel);
const movimientoRepo = new MovimientoRepository(movimientoModel);
const puntosRepo = new BaseRepository<PuntosMovimiento>(puntosModel);
const skinRepo = new SkinRepository(skinModel);
const salaRepo = new SalaRepository(salaModel);
const reclamoRepo = new ReclamoRepository(reclamoModel);
const partidaRepo = new PartidaRepository(partidaModel);
const partidaTablaRepo = new PartidaTablaRepository(partidaTablaModel);
const logroRepo = new LogroRepository(logroModel);
const progresoRepo = new ProgresoRepository();
const amigoRepo = new AmigoRepository();
const avisoRepo = new AvisoRepository();

// ---------- servicios ----------
const fichasService = new FichasService(usuarioRepo, movimientoRepo);
const puntosService = new PuntosService(puntosRepo, usuarioRepo, partidaRepo, partidaTablaRepo);
const skinService = new SkinService(skinRepo, usuarioRepo, puntosService);
const salaService = new SalaService(salaRepo, figuraRepo, usuarioRepo);
const tablaService = new TablaService(tablaRepo);
const ganadoresService = new GanadoresService(partidaRepo, reclamoRepo, salaRepo, fichasService, puntosService);
const cantorService = new CantorService(
  partidaRepo, partidaTablaRepo, logroRepo, figuraRepo, cartaRepo, salaRepo, puntosService, fichasService, ganadoresService,
);
const tablasPartidaService = new TablasPartidaService(partidaRepo, partidaTablaRepo, tablaRepo, salaService, fichasService);
const botsService = new BotsService(salaRepo, salaService, usuarioRepo, partidaRepo, partidaTablaRepo, tablasPartidaService);
const avisoService = new AvisoService(avisoRepo);
const partidaService = new PartidaService(
  partidaRepo, partidaTablaRepo, logroRepo, reclamoRepo, figuraRepo, salaService, salaRepo, cantorService, fichasService, botsService,
  avisoService,
);
const progresoService = new ProgresoService(progresoRepo, usuarioRepo, puntosService, skinService, fichasService);
const amigoService = new AmigoService(amigoRepo, usuarioRepo);
const authService = new AuthService(usuarioRepo, skinService);

// ---------- controladores ----------
const partidaController = new PartidaController(partidaService, tablasPartidaService);

/** Routers listos para montar en app.ts, por prefijo. */
export const rutas = {
  '/auth': authRoutes(new AuthController(authService)),
  '/usuarios': usuarioRoutes(new BaseController(new BaseService(usuarioRepo), usuarioModel)),
  '/cartas': catalogoRoutes(new BaseController(new BaseService(cartaRepo), cartaModel)),
  '/figuras': catalogoRoutes(new BaseController(new BaseService(figuraRepo), figuraModel)),
  '/tablas': tablaRoutes(new BaseController(tablaService, tablaModel)),
  '/salas': salaRoutes(new SalaController(salaService, botsService)),
  '/partidas': partidaRoutes(partidaController),
  '/partida-tablas': partidaTablaRoutes(partidaController),
  '/reclamos': reclamoRoutes(new BaseController(new BaseService(reclamoRepo), reclamoModel)),
  '/movimientos': movimientoRoutes(new BaseController(new BaseService(movimientoRepo), movimientoModel)),
  '/puntos': puntosRoutes(new PuntosController(puntosService)),
  '/skins': skinRoutes(new SkinController(skinService)),
  '/progreso': progresoRoutes(new ProgresoController(progresoService)),
  '/amigos': amigoRoutes(new AmigoController(amigoService)),
  '/avisos': avisoRoutes(avisoService),
};

/** Lo que necesita la capa de tiempo real. */
export const realtimeDeps = { salaRepo, amigoRepo };

/** Lo que necesitan las tareas periódicas del servidor. */
export const tareasDeps = {
  premiarSemanaPasada: () => progresoService.premiarSemanaPasada(),
  recordarDiario: () => avisoService.recordarDiario(),
};
