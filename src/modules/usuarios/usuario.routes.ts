import { BaseController } from '../../core/controller/BaseController';
import { crudRoutes } from '../../core/routes/RouteFactory';
import { auth } from '../../core/middleware/auth';
import { Usuario } from './usuario.model';

/** Administración de usuarios: solo admin. El registro público vive en /auth. */
export const usuarioRoutes = (ctrl: BaseController<Usuario>) =>
  crudRoutes(ctrl, { excepto: ['create'], comun: [auth('admin')] });
