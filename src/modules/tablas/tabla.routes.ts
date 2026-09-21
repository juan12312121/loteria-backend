import { BaseController } from '../../core/controller/BaseController';
import { crudRoutes } from '../../core/routes/RouteFactory';
import { auth } from '../../core/middleware/auth';
import { Tabla } from './tabla.model';

/** Cualquiera las ve; con sesión creas/editas/borras las tuyas. */
export const tablaRoutes = (ctrl: BaseController<Tabla>) =>
  crudRoutes(ctrl, { porAccion: { create: [auth()], update: [auth()], remove: [auth()] } });
