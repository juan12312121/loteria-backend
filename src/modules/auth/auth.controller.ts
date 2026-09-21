import { Request, Response } from 'express';
import { ApiResponse } from '../../core/http/ApiResponse';
import { AuthService } from './auth.service';

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  registro = async (req: Request, res: Response) => ApiResponse.created(res, await this.auth.registrar(req.body));

  login = async (req: Request, res: Response) => ApiResponse.ok(res, await this.auth.login(req.body.correo, req.body.password));

  yo = async (req: Request, res: Response) => ApiResponse.ok(res, await this.auth.perfil(req.actor!.id));
}
