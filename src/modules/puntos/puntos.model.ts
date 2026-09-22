import { z } from 'zod';
import { BaseModel } from '../../core/model/BaseModel';

export type TipoPuntos =
  | 'participacion' | 'victoria' | 'logro' | 'bono' | 'penalizacion' | 'canje' | 'ajuste'
  | 'diario' | 'mision' | 'ranking' | 'nivel' | 'pase';

export interface PuntosMovimiento {
  id: string;
  usuario_id: string;
  partida_id: string | null;
  tipo: TipoPuntos;
  monto: number;
  saldo_despues: number;
  detalle: string;
  creado_en: string;
}

export class PuntosModel extends BaseModel {
  tabla = 'puntos_movimientos';
  columnas = ['id', 'usuario_id', 'partida_id', 'tipo', 'monto', 'saldo_despues', 'detalle', 'creado_en'] as const;
  filtrables = ['usuario_id', 'partida_id', 'tipo'];
  ordenables = ['creado_en', 'monto'];
  crear = z.never();
  actualizar = z.never();
}

export const puntosModel = new PuntosModel();
