import { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../http/HttpError';
import { ApiResponse } from '../http/ApiResponse';

export const notFound: RequestHandler = (req, res) =>
  ApiResponse.error(res, 404, 'RUTA_NO_ENCONTRADA', `No existe ${req.method} ${req.path}`);

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) return ApiResponse.error(res, err.status, err.codigo, err.message, err.detalles);
  // Errores de Postgres que vale la pena traducir
  if (err?.code === '23505') return ApiResponse.error(res, 409, 'DUPLICADO', 'Ya existe un registro igual');
  if (err?.code === '23503') return ApiResponse.error(res, 422, 'REFERENCIA_INVALIDA', 'Referencia a un registro que no existe');
  if (err?.code === '23514') return ApiResponse.error(res, 422, 'RESTRICCION', 'Valor fuera de lo permitido');
  if (err?.code === '22P02') return ApiResponse.error(res, 400, 'FORMATO_INVALIDO', 'Formato de dato inválido');
  console.error(err);
  return ApiResponse.error(res, 500, 'ERROR_INTERNO', 'Error interno');
};
