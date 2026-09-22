import { Router } from 'express';
import { accion } from '../../core/routes/RouteFactory';
import { auth } from '../../core/middleware/auth';
import { ProgresoController } from './progreso.controller';

export function progresoRoutes(ctrl: ProgresoController) {
  const r = Router();
  accion(r, 'get', '/', auth(), ctrl.resumen);
  accion(r, 'post', '/diario', auth(), ctrl.reclamarDiario);
  accion(r, 'post', '/misiones/:clave/cobrar', auth(), ctrl.cobrarMision);
  accion(r, 'post', '/nivel', auth(), ctrl.cobrarNivel);
  accion(r, 'post', '/pase/:nivel', auth(), ctrl.cobrarPase);
  accion(r, 'post', '/banco', auth(), ctrl.cobrarBanco);
  accion(r, 'get', '/ranking', auth(), ctrl.ranking);
  accion(r, 'get', '/perfil', auth(), ctrl.miPerfil);
  accion(r, 'get', '/perfil/:id', auth(), ctrl.perfil);
  return r;
}
