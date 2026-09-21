import { Request, Response } from 'express';
import { BaseService } from '../service/BaseService';
import { BaseModel } from '../model/BaseModel';
import { ApiResponse } from '../http/ApiResponse';
import { BadRequest } from '../http/HttpError';

/**
 * Controlador CRUD genérico. Los handlers son arrow functions para que
 * se puedan pasar directo a Express sin perder `this`.
 */
export class BaseController<T extends Record<string, any>> {
  constructor(
    protected readonly service: BaseService<T>,
    protected readonly model: BaseModel,
  ) {}

  protected validar<S>(esquema: { safeParse: (d: unknown) => any }, datos: unknown): S {
    const r = esquema.safeParse(datos);
    if (!r.success) throw new BadRequest('Datos inválidos', r.error.issues);
    return r.data as S;
  }

  /** Separa paginación/orden de los filtros en la query string. */
  protected opcionesDeQuery(q: Request['query']) {
    const { pagina, porPagina, orden, ...filtros } = q as Record<string, string>;
    return {
      pagina: pagina ? Number(pagina) : undefined,
      porPagina: porPagina ? Number(porPagina) : undefined,
      orden,
      filtros,
    };
  }

  list = async (req: Request, res: Response) => {
    const p = await this.service.listar(this.opcionesDeQuery(req.query), req.actor);
    return ApiResponse.paginated(res, p.filas, { pagina: p.pagina, porPagina: p.porPagina, total: p.total });
  };

  /** Igual que list, pero solo las filas del usuario que pide (tablas con usuario_id). */
  listMios = async (req: Request, res: Response) => {
    const op = this.opcionesDeQuery(req.query);
    const p = await this.service.listar({ ...op, filtros: { ...op.filtros, usuario_id: req.actor!.id } }, req.actor);
    return ApiResponse.paginated(res, p.filas, { pagina: p.pagina, porPagina: p.porPagina, total: p.total });
  };

  get = async (req: Request, res: Response) => {
    return ApiResponse.ok(res, await this.service.obtener(req.params.id, req.actor));
  };

  create = async (req: Request, res: Response) => {
    const datos = this.validar<Record<string, unknown>>(this.model.crear, req.body);
    return ApiResponse.created(res, await this.service.crear(datos, req.actor));
  };

  update = async (req: Request, res: Response) => {
    const datos = this.validar<Record<string, unknown>>(this.model.actualizar, req.body);
    return ApiResponse.ok(res, await this.service.actualizar(req.params.id, datos, req.actor));
  };

  remove = async (req: Request, res: Response) => {
    await this.service.borrar(req.params.id, req.actor);
    return ApiResponse.noContent(res);
  };
}
