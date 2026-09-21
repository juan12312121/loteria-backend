import { Router, RequestHandler } from 'express';
import { BaseController } from '../controller/BaseController';
import { asyncHandler } from '../middleware/asyncHandler';

export type Accion = 'list' | 'get' | 'create' | 'update' | 'remove';

export interface OpcionesCrud {
  /** Solo estas acciones (por defecto todas) */
  solo?: Accion[];
  /** Todas menos estas */
  excepto?: Accion[];
  /** Middleware para todas las rutas del CRUD */
  comun?: RequestHandler[];
  /** Middleware por acción (p. ej. auth('admin') solo en create/update/remove) */
  porAccion?: Partial<Record<Accion, RequestHandler[]>>;
}

const DEF: Record<Accion, { metodo: 'get' | 'post' | 'patch' | 'delete'; ruta: string }> = {
  list: { metodo: 'get', ruta: '/' },
  get: { metodo: 'get', ruta: '/:id' },
  create: { metodo: 'post', ruta: '/' },
  update: { metodo: 'patch', ruta: '/:id' },
  remove: { metodo: 'delete', ruta: '/:id' },
};

/** Genera las 5 rutas CRUD de un controlador en un Router listo para montar. */
export function crudRoutes(ctrl: BaseController<any>, op: OpcionesCrud = {}): Router {
  const router = Router();
  let acciones = op.solo ?? (Object.keys(DEF) as Accion[]);
  if (op.excepto) acciones = acciones.filter((a) => !op.excepto!.includes(a));
  for (const accion of acciones) {
    const { metodo, ruta } = DEF[accion];
    router[metodo](ruta, ...(op.comun ?? []), ...(op.porAccion?.[accion] ?? []), asyncHandler(ctrl[accion]));
  }
  return router;
}

/** Atajo para rutas de acción (POST /:id/iniciar, etc.) con asyncHandler ya puesto. */
export function accion(
  router: Router,
  metodo: 'get' | 'post' | 'patch' | 'delete',
  ruta: string,
  ...handlers: RequestHandler[]
) {
  const ultimo = handlers.pop()!;
  router[metodo](ruta, ...handlers, asyncHandler(ultimo as any));
}
