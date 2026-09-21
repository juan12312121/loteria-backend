import { Router } from 'express';
import { crudRoutes, accion } from '../../core/routes/RouteFactory';
import { auth } from '../../core/middleware/auth';
import { validar } from '../../core/middleware/validar';
import { PartidaController } from './partida.controller';
import { esquemasPartida } from './partida.model';

export function partidaRoutes(ctrl: PartidaController) {
  const r = Router();
  accion(r, 'get', '/:id/estado', auth(), ctrl.estado);
  accion(r, 'post', '/:id/iniciar', auth(), ctrl.iniciar);
  accion(r, 'post', '/:id/pausar', auth(), ctrl.pausar);
  accion(r, 'post', '/:id/reanudar', auth(), ctrl.reanudar);
  accion(r, 'post', '/:id/cancelar', auth(), ctrl.cancelar);
  accion(r, 'post', '/:id/cantar', auth(), ctrl.cantar);
  accion(r, 'post', '/:id/tablas', auth(), validar(esquemasPartida.elegirTabla), ctrl.elegirTabla);
  r.use(crudRoutes(ctrl, { comun: [auth()] }));
  return r;
}

/** Rutas sobre una tabla ya elegida en una partida. */
export function partidaTablaRoutes(ctrl: PartidaController) {
  const r = Router();
  accion(r, 'patch', '/:id/marcas', auth(), validar(esquemasPartida.marcas), ctrl.marcar);
  accion(r, 'delete', '/:id', auth(), ctrl.soltarTabla);
  return r;
}
