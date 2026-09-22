import { Router } from 'express';
import { z } from 'zod';
import { accion } from '../../core/routes/RouteFactory';
import { auth } from '../../core/middleware/auth';
import { validar } from '../../core/middleware/validar';
import { AmigoController } from './amigo.controller';

const solicitud = z.object({ codigo: z.string().trim().length(6) });

export function amigoRoutes(ctrl: AmigoController) {
  const r = Router();
  accion(r, 'get', '/', auth(), ctrl.resumen);
  accion(r, 'post', '/solicitudes', auth(), validar(solicitud), ctrl.solicitar);
  accion(r, 'post', '/solicitudes/:id/aceptar', auth(), ctrl.aceptar);
  accion(r, 'delete', '/:id', auth(), ctrl.quitar);
  accion(r, 'get', '/:id/historial', auth(), ctrl.historial);
  return r;
}
