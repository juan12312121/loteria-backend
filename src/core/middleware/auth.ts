import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { Unauthorized, Forbidden } from '../http/HttpError';
import { Actor } from '../service/BaseService';

declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
    }
  }
}

export function firmarToken(actor: Actor): string {
  return jwt.sign(actor, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRA as any });
}

export function verificarToken(token: string): Actor {
  try {
    const p = jwt.verify(token, env.JWT_SECRET) as Actor;
    return { id: p.id, rol: p.rol };
  } catch {
    throw new Unauthorized('Token inválido o vencido');
  }
}

/** Exige Bearer token; si se pasan roles, exige uno de ellos. */
export const auth =
  (...roles: Actor['rol'][]): RequestHandler =>
  (req, _res, next) => {
    const h = req.headers.authorization ?? '';
    if (!h.startsWith('Bearer ')) return next(new Unauthorized());
    const actor = verificarToken(h.slice(7));
    if (roles.length && !roles.includes(actor.rol)) return next(new Forbidden());
    req.actor = actor;
    next();
  };
