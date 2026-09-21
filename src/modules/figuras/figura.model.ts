import { z } from 'zod';
import { BaseModel } from '../../core/model/BaseModel';

export interface Figura {
  id: number;
  clave: string;
  nombre: string;
  mascaras: number[];
  descripcion: string;
  puntos: number;
  /** true = se anuncia y da puntos al primero, pero NO termina la ronda */
  intermedia: boolean;
}

export class FiguraModel extends BaseModel {
  tabla = 'figuras';
  columnas = ['id', 'clave', 'nombre', 'mascaras', 'descripcion', 'puntos', 'intermedia'] as const;
  filtrables = ['clave', 'intermedia'];
  ordenables = ['id', 'nombre'];
  ordenDefault = 'id';
  crear = z.object({
    clave: z.string().regex(/^[a-z_]+$/),
    nombre: z.string().min(1),
    mascaras: z.array(z.number().int().min(1).max(0xffff)).min(1),
    descripcion: z.string().default(''),
    puntos: z.number().int().min(0).default(30),
    intermedia: z.boolean().default(false),
  });
  actualizar = this.crear.partial();
}

export const figuraModel = new FiguraModel();

/** Figura con la que se juega la lotería tradicional. */
export const FIGURA_POR_DEFECTO = 'llena';
