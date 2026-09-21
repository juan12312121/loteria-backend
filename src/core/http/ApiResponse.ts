import { Response } from 'express';

export interface Meta {
  pagina: number;
  porPagina: number;
  total: number;
}

/** Todas las respuestas del API salen por aquí para que tengan la misma forma. */
export class ApiResponse {
  static ok<T>(res: Response, data: T, meta?: Meta) {
    return res.status(200).json(meta ? { ok: true, data, meta } : { ok: true, data });
  }
  static created<T>(res: Response, data: T) {
    return res.status(201).json({ ok: true, data });
  }
  static noContent(res: Response) {
    return res.status(204).send();
  }
  static paginated<T>(res: Response, data: T[], meta: Meta) {
    return ApiResponse.ok(res, data, meta);
  }
  static error(res: Response, status: number, codigo: string, mensaje: string, detalles: unknown[] = []) {
    return res.status(status).json({ ok: false, error: { codigo, mensaje, detalles } });
  }
}
