import { Request, Response } from 'express';
import { BaseController } from '../../core/controller/BaseController';
import { ApiResponse } from '../../core/http/ApiResponse';
import { PartidaService } from './partida.service';
import { TablasPartidaService } from './tablas-partida.service';
import { Partida, partidaModel } from './partida.model';

export class PartidaController extends BaseController<Partida> {
  constructor(
    private readonly partidas: PartidaService,
    private readonly tablas: TablasPartidaService,
  ) {
    super(partidas, partidaModel);
  }

  estado = async (req: Request, res: Response) => ApiResponse.ok(res, await this.partidas.estado(req.params.id, req.actor!));
  iniciar = async (req: Request, res: Response) => ApiResponse.ok(res, await this.partidas.iniciar(req.params.id, req.actor!));
  pausar = async (req: Request, res: Response) => ApiResponse.ok(res, await this.partidas.pausar(req.params.id, req.actor!));
  reanudar = async (req: Request, res: Response) => ApiResponse.ok(res, await this.partidas.reanudar(req.params.id, req.actor!));
  cancelar = async (req: Request, res: Response) => ApiResponse.ok(res, await this.partidas.cancelar(req.params.id, req.actor!));
  cantar = async (req: Request, res: Response) => ApiResponse.ok(res, await this.partidas.cantar(req.params.id, req.actor!));

  elegirTabla = async (req: Request, res: Response) =>
    ApiResponse.created(res, await this.tablas.elegir(req.params.id, req.body.tabla_id, req.actor!));

  marcar = async (req: Request, res: Response) => ApiResponse.ok(res, await this.tablas.marcar(req.params.id, req.body.marcas, req.actor!));

  soltarTabla = async (req: Request, res: Response) => {
    await this.tablas.soltar(req.params.id, req.actor!);
    return ApiResponse.noContent(res);
  };
}
