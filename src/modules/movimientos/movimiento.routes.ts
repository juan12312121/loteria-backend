import { Router } from 'express';
import { BaseController } from '../../core/controller/BaseController';
import { crudRoutes, accion } from '../../core/routes/RouteFactory';
import { auth } from '../../core/middleware/auth';
import { Movimiento } from './movimiento.model';

/** Solo lectura: cada quien ve los suyos en /mios; admin ve todos. */
export function movimientoRoutes(ctrl: BaseController<Movimiento>) {
  const r = Router();
  accion(r, 'get', '/mios', auth(), ctrl.listMios);
  r.use(crudRoutes(ctrl, { solo: ['list', 'get'], comun: [auth('admin')] }));
  return r;
}
