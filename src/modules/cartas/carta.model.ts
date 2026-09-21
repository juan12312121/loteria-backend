import { z } from 'zod';
import { BaseModel } from '../../core/model/BaseModel';

export interface Carta {
  id: number;
  nombre: string;
  verso: string;
  imagen_url: string | null;
}

export class CartaModel extends BaseModel {
  tabla = 'cartas';
  columnas = ['id', 'nombre', 'verso', 'imagen_url'] as const;
  ordenables = ['id', 'nombre'];
  ordenDefault = 'id';
  crear = z.object({
    id: z.number().int().min(1).max(54),
    nombre: z.string().min(1),
    verso: z.string().default(''),
    imagen_url: z.string().url().nullable().optional(),
  });
  actualizar = this.crear.partial().omit({ id: true });
}

export const cartaModel = new CartaModel();
