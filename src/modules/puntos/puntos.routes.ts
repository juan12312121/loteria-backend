import { Router } from 'express';
import { crudRoutes, accion } from '../../core/routes/RouteFactory';
import { auth } from '../../core/middleware/auth';
import { PuntosController } from './puntos.controller';

export function puntosRoutes(ctrl: PuntosController) {
  const r = Router();
  accion(r, 'get', '/reglas', ctrl.reglas);
  accion(r, 'get', '/ranking', ctrl.ranking);
  accion(r, 'get', '/mios', auth(), ctrl.listMios);
  r.use(crudRoutes(ctrl, { solo: ['list', 'get'], comun: [auth('admin')] }));
  return r;
}
