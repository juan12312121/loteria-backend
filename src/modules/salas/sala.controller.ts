import { Request, Response } from 'express';
import { BaseController } from '../../core/controller/BaseController';
import { ApiResponse } from '../../core/http/ApiResponse';
import { SalaService } from './sala.service';
import { Sala, salaModel } from './sala.model';

export class SalaController extends BaseController<Sala> {
  constructor(private readonly salas: SalaService) {
    super(salas, salaModel);
  }

  mias = async (req: Request, res: Response) => ApiResponse.ok(res, await this.salas.mias(req.actor!.id));

  unirse = async (req: Request, res: Response) => ApiResponse.ok(res, await this.salas.unirse(req.params.codigo, req.actor!));

  salir = async (req: Request, res: Response) => {
    await this.salas.salir(req.params.id, req.actor!);
    return ApiResponse.noContent(res);
  };

  jugadores = async (req: Request, res: Response) => ApiResponse.ok(res, await this.salas.jugadores(req.params.id, req.actor!));
}
