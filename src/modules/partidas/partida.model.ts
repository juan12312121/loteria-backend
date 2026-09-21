import { z } from 'zod';
import { BaseModel } from '../../core/model/BaseModel';

export type EstadoPartida = 'preparando' | 'cantando' | 'pausada' | 'terminada' | 'cancelada';
export const ESTADOS_EN_CURSO: EstadoPartida[] = ['preparando', 'cantando', 'pausada'];
export const TOTAL_CARTAS = 54;

export interface Partida {
  id: string;
  sala_id: string;
  numero: number;
  figura_id: number;
  indice: number;
  pozo: number;
  estado: EstadoPartida;
  iniciada_en: string | null;
  terminada_en: string | null;
  creado_en: string;
}

export class PartidaModel extends BaseModel {
  tabla = 'partidas';
  columnas = [
    'id', 'sala_id', 'numero', 'figura_id', 'mazo', 'indice', 'pozo', 'estado',
    'iniciada_en', 'terminada_en', 'puntos_otorgados', 'creado_en',
  ] as const;
  /** El mazo jamás sale por el API: es el secreto del cantor. */
  ocultas = ['mazo', 'puntos_otorgados'];
  filtrables = ['sala_id', 'estado'];
  ordenables = ['creado_en', 'numero'];
  crear = z.object({
    sala_id: z.string().uuid(),
    figura_id: z.number().int().positive().optional(),
  });
  actualizar = z.object({ figura_id: z.number().int().positive() });
}

export const partidaModel = new PartidaModel();

export const esquemasPartida = {
  elegirTabla: z.object({ tabla_id: z.string().uuid() }),
  marcas: z.object({ marcas: z.number().int().min(0).max(0xffff) }),
};
