import { z } from 'zod';
import { BaseModel } from '../../core/model/BaseModel';

export interface Tabla {
  id: string;
  nombre: string;
  /** 16 cartas; la posición i es la casilla (fila = i / 4, col = i % 4) */
  cartas: number[];
  oficial: boolean;
  creado_por: string | null;
  creado_en: string;
}

export class TablaModel extends BaseModel {
  tabla = 'tablas';
  columnas = ['id', 'nombre', 'cartas', 'oficial', 'creado_por', 'creado_en'] as const;
  filtrables = ['oficial', 'creado_por'];
  ordenables = ['creado_en', 'nombre'];
  crear = z.object({
    nombre: z.string().trim().min(1).max(60),
    /** Si no mandan cartas, el servidor genera 16 al azar */
    cartas: z.array(z.number().int().min(1).max(54)).length(16).optional(),
    oficial: z.boolean().optional(),
  });
  actualizar = z.object({ nombre: z.string().trim().min(1).max(60) });
}

export const tablaModel = new TablaModel();
