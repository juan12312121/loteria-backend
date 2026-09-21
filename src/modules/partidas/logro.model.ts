import { z } from 'zod';
import { BaseModel } from '../../core/model/BaseModel';

/** Figura intermedia (cuatro esquinas, La O…) que alguien completó durante la ronda. */
export interface Logro {
  id: string;
  partida_id: string;
  partida_tabla_id: string;
  usuario_id: string;
  figura_id: number;
  indice: number;
  mascara: number;
  puntos: number;
  primero: boolean;
  creado_en: string;
}

export class LogroModel extends BaseModel {
  tabla = 'logros';
  columnas = ['id', 'partida_id', 'partida_tabla_id', 'usuario_id', 'figura_id', 'indice', 'mascara', 'puntos', 'primero', 'creado_en'] as const;
  filtrables = ['partida_id', 'usuario_id', 'figura_id'];
  crear = z.never();
  actualizar = z.never();
}

export const logroModel = new LogroModel();
