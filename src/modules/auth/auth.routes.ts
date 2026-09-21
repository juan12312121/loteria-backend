import { Router } from 'express';
import { z } from 'zod';
import { accion } from '../../core/routes/RouteFactory';
import { validar } from '../../core/middleware/validar';
import { auth } from '../../core/middleware/auth';
import { limiteAuth } from '../../core/middleware/limites';
import { usuarioModel } from '../usuarios/usuario.model';
import { AuthController } from './auth.controller';

const loginSchema = z.object({ correo: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

export function authRoutes(ctrl: AuthController) {
  const r = Router();
  accion(r, 'post', '/registro', limiteAuth, validar(usuarioModel.crear), ctrl.registro);
  accion(r, 'post', '/login', limiteAuth, validar(loginSchema), ctrl.login);
  accion(r, 'get', '/yo', auth(), ctrl.yo);
  return r;
}
