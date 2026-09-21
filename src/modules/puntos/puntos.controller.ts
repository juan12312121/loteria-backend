import { Request, Response } from 'express';
import { BaseController } from '../../core/controller/BaseController';
import { ApiResponse } from '../../core/http/ApiResponse';
import { REGLAS_PUNTOS } from '../../juego/Puntos';
import { PuntosService } from './puntos.service';
import { PuntosMovimiento, puntosModel } from './puntos.model';

export class PuntosController extends BaseController<PuntosMovimiento> {
  constructor(private readonly puntos: PuntosService) {
    super(puntos, puntosModel);
  }

  reglas = async (_req: Request, res: Response) => ApiResponse.ok(res, REGLAS_PUNTOS);

  ranking = async (req: Request, res: Response) => ApiResponse.ok(res, await this.puntos.ranking(Number(req.query.limite)));
}
