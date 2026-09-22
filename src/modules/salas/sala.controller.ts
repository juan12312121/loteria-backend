import { Request, Response } from 'express';
import { BaseController } from '../../core/controller/BaseController';
import { ApiResponse } from '../../core/http/ApiResponse';
import { SalaService } from './sala.service';
import { BotsService } from './bots.service';
import { Sala, salaModel } from './sala.model';

export class SalaController extends BaseController<Sala> {
  constructor(
    private readonly salas: SalaService,
    private readonly bots: BotsService,
  ) {
    super(salas, salaModel);
  }

  publicas = async (req: Request, res: Response) => ApiResponse.ok(res, await this.salas.publicas(req.actor!.id));

  agregarBot = async (req: Request, res: Response) => ApiResponse.created(res, await this.bots.agregar(req.params.id, req.actor!));

  quitarBot = async (req: Request, res: Response) => {
    await this.bots.quitar(req.params.id, req.params.botId, req.actor!);
    return ApiResponse.noContent(res);
  };

  mias = async (req: Request, res: Response) => ApiResponse.ok(res, await this.salas.mias(req.actor!.id));

  unirse = async (req: Request, res: Response) =>
    ApiResponse.ok(res, await this.salas.unirse(req.params.codigo, req.actor!, String(req.body?.password ?? '')));

  salir = async (req: Request, res: Response) => {
    await this.salas.salir(req.params.id, req.actor!);
    return ApiResponse.noContent(res);
  };

  jugadores = async (req: Request, res: Response) => ApiResponse.ok(res, await this.salas.jugadores(req.params.id, req.actor!));
}
