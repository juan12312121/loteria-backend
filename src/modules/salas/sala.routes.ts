import { Router } from 'express';
import { crudRoutes, accion } from '../../core/routes/RouteFactory';
import { auth } from '../../core/middleware/auth';
import { SalaController } from './sala.controller';

export function salaRoutes(ctrl: SalaController) {
  const r = Router();
  accion(r, 'get', '/mias', auth(), ctrl.mias);
  accion(r, 'get', '/publicas', auth(), ctrl.publicas);
  accion(r, 'post', '/:id/bots', auth(), ctrl.agregarBot);
  accion(r, 'delete', '/:id/bots/:botId', auth(), ctrl.quitarBot);
  accion(r, 'post', '/unirse/:codigo', auth(), ctrl.unirse);
  accion(r, 'post', '/:id/salir', auth(), ctrl.salir);
  accion(r, 'get', '/:id/jugadores', auth(), ctrl.jugadores);
  r.use(crudRoutes(ctrl, { comun: [auth()] }));
  return r;
}
