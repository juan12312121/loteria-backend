import { Request, Response } from 'express';
import { ApiResponse } from '../../core/http/ApiResponse';
import { ProgresoService } from './progreso.service';

export class ProgresoController {
  constructor(private readonly progreso: ProgresoService) {}

  resumen = async (req: Request, res: Response) => ApiResponse.ok(res, await this.progreso.resumen(req.actor!.id));
  reclamarDiario = async (req: Request, res: Response) => ApiResponse.ok(res, await this.progreso.reclamarDiario(req.actor!.id));
  cobrarMision = async (req: Request, res: Response) =>
    ApiResponse.ok(res, await this.progreso.cobrarMision(req.actor!.id, req.params.clave));
  cobrarNivel = async (req: Request, res: Response) => ApiResponse.ok(res, await this.progreso.cobrarNivel(req.actor!.id));
  cobrarPase = async (req: Request, res: Response) => ApiResponse.ok(res, await this.progreso.cobrarPase(req.actor!.id, Number(req.params.nivel)));
  cobrarBanco = async (req: Request, res: Response) => ApiResponse.ok(res, await this.progreso.cobrarBanco(req.actor!.id));
  ranking = async (req: Request, res: Response) => ApiResponse.ok(res, await this.progreso.rankingSemanal(Number(req.query.limite) || 20));
  miPerfil = async (req: Request, res: Response) => ApiResponse.ok(res, await this.progreso.perfil(req.actor!.id));
  perfil = async (req: Request, res: Response) => ApiResponse.ok(res, await this.progreso.perfil(req.params.id));
}
