import { Request, Response, NextFunction, RequestHandler } from 'express';

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Manda cualquier promesa rechazada al errorHandler. */
export const asyncHandler =
  (fn: Handler): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
