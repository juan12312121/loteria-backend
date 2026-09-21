import rateLimit from 'express-rate-limit';
import { ApiResponse } from '../http/ApiResponse';

/** Freno contra fuerza bruta en login/registro: 20 intentos por IP cada 15 minutos. */
export const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => ApiResponse.error(res, 429, 'DEMASIADOS_INTENTOS', 'Demasiados intentos, espera unos minutos'),
});

/** Límite general amplio para todo el API (evita abusos sin estorbar el juego). */
export const limiteGeneral = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => ApiResponse.error(res, 429, 'DEMASIADAS_PETICIONES', 'Demasiadas peticiones, baja el ritmo'),
});
