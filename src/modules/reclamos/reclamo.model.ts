import { z } from 'zod';
import { BaseModel } from '../../core/model/BaseModel';

/** Un grito de "¡Lotería!": válido o falso. */
export interface Reclamo {
  id: string;
  partida_id: string;
  partida_tabla_id: string;
  usuario_id: string;
  indice_al_gritar: number;
  valido: boolean;
  mascara_ganadora: number | null;
  premio: number;
  motivo: string;
  creado_en: string;
}

export class ReclamoModel extends BaseModel {
  tabla = 'reclamos';
  columnas = [
    'id', 'partida_id', 'partida_tabla_id', 'usuario_id', 'indice_al_gritar', 'valido',
    'mascara_ganadora', 'premio', 'motivo', 'creado_en',
  ] as const;
  filtrables = ['partida_id', 'usuario_id', 'valido'];
  ordenables = ['creado_en'];
  /** Los crea el tablero al detectar una tabla ganadora (GanadoresService) */
  crear = z.never();
  actualizar = z.never();
}

export const reclamoModel = new ReclamoModel();
