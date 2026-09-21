import { BaseController } from '../controller/BaseController';
import { auth } from '../middleware/auth';
import { crudRoutes } from './RouteFactory';

/** Catálogo: cualquiera lo lee, solo admin lo modifica (cartas, figuras, skins). */
export const catalogoRoutes = (ctrl: BaseController<any>) =>
  crudRoutes(ctrl, {
    porAccion: { create: [auth('admin')], update: [auth('admin')], remove: [auth('admin')] },
  });
