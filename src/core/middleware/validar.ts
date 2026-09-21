import { RequestHandler } from 'express';
import { ZodTypeAny } from 'zod';
import { BadRequest } from '../http/HttpError';

/** Valida body/params/query con zod y deja el resultado limpio en req. */
export const validar =
  (esquema: ZodTypeAny, donde: 'body' | 'params' | 'query' = 'body'): RequestHandler =>
  (req, _res, next) => {
    const r = esquema.safeParse(req[donde]);
    if (!r.success) return next(new BadRequest('Datos inválidos', r.error.issues));
    (req as any)[donde] = r.data;
    next();
  };
