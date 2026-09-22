import { Request, Response } from 'express';
import { ApiResponse } from '../../core/http/ApiResponse';
import { AmigoService } from './amigo.service';

export class AmigoController {
  constructor(private readonly amigos: AmigoService) {}

  resumen = async (req: Request, res: Response) => ApiResponse.ok(res, await this.amigos.resumen(req.actor!.id));

  solicitar = async (req: Request, res: Response) =>
    ApiResponse.created(res, await this.amigos.solicitar(String(req.body.codigo ?? ''), req.actor!));

  aceptar = async (req: Request, res: Response) => ApiResponse.ok(res, await this.amigos.aceptar(req.params.id, req.actor!));

  quitar = async (req: Request, res: Response) => {
    await this.amigos.quitar(req.params.id, req.actor!);
    return ApiResponse.noContent(res);
  };

  historial = async (req: Request, res: Response) => ApiResponse.ok(res, await this.amigos.historial(req.params.id, req.actor!));
}
