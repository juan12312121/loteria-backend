import { Router } from 'express';
import { accion } from '../../core/routes/RouteFactory';
import { catalogoRoutes } from '../../core/routes/catalogo';
import { auth } from '../../core/middleware/auth';
import { SkinController } from './skin.controller';

export function skinRoutes(ctrl: SkinController) {
  const r = Router();
  accion(r, 'get', '/catalogo', auth(), ctrl.catalogo);
  accion(r, 'get', '/mias', auth(), ctrl.mias);
  accion(r, 'post', '/:id/canjear', auth(), ctrl.canjear);
  accion(r, 'post', '/:id/equipar', auth(), ctrl.equipar);
  accion(r, 'delete', '/equipo/:tipo', auth(), ctrl.quitar);
  r.use(catalogoRoutes(ctrl));
  return r;
}
