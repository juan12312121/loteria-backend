import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { accion } from '../../core/routes/RouteFactory';
import { auth } from '../../core/middleware/auth';
import { validar } from '../../core/middleware/validar';
import { ApiResponse } from '../../core/http/ApiResponse';
import { AvisoService } from './aviso.service';

const registro = z.object({ token: z.string().trim().min(10).max(200) });

export function avisoRoutes(avisos: AvisoService) {
  const r = Router();
  accion(r, 'post', '/dispositivos', auth(), validar(registro), async (req: Request, res: Response) => {
    await avisos.registrar(req.body.token, req.actor!);
    return ApiResponse.noContent(res);
  });
  accion(r, 'delete', '/dispositivos/:token', auth(), async (req: Request, res: Response) => {
    await avisos.quitar(req.params.token);
    return ApiResponse.noContent(res);
  });
  return r;
}
