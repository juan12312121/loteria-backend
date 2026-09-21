import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/controller/BaseController';
import { ApiResponse } from '../../core/http/ApiResponse';
import { TIPOS_SKIN, TipoSkin } from '../usuarios/usuario.model';
import { SkinService } from './skin.service';
import { Skin, skinModel } from './skin.model';

const tipoSchema = z.enum(TIPOS_SKIN);

export class SkinController extends BaseController<Skin> {
  constructor(private readonly skins: SkinService) {
    super(skins, skinModel);
  }

  catalogo = async (req: Request, res: Response) => {
    const tipo = req.query.tipo ? this.validar<TipoSkin>(tipoSchema, req.query.tipo) : undefined;
    return ApiResponse.ok(res, await this.skins.catalogo(req.actor!.id, tipo));
  };

  coleccion = async (req: Request, res: Response) => ApiResponse.ok(res, await this.skins.coleccion(req.actor!.id));

  mias = async (req: Request, res: Response) => ApiResponse.ok(res, await this.skins.mias(req.actor!.id));

  canjear = async (req: Request, res: Response) => ApiResponse.ok(res, await this.skins.canjear(req.params.id, req.actor!));

  equipar = async (req: Request, res: Response) => ApiResponse.ok(res, await this.skins.equipar(req.params.id, req.actor!));

  quitar = async (req: Request, res: Response) =>
    ApiResponse.ok(res, await this.skins.quitar(this.validar(tipoSchema, req.params.tipo), req.actor!));
}
