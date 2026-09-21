import { BaseController } from '../../core/controller/BaseController';
import { crudRoutes } from '../../core/routes/RouteFactory';
import { auth } from '../../core/middleware/auth';
import { Reclamo } from './reclamo.model';

export const reclamoRoutes = (ctrl: BaseController<Reclamo>) => crudRoutes(ctrl, { solo: ['list', 'get'], comun: [auth()] });
