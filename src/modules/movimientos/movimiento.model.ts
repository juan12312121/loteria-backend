import { z } from 'zod';
import { BaseModel } from '../../core/model/BaseModel';

export type TipoMovimiento = 'apuesta' | 'premio' | 'bono' | 'ajuste' | 'reembolso';

export interface Movimiento {
  id: string;
  usuario_id: string;
  partida_id: string | null;
  tipo: TipoMovimiento;
  monto: number;
  saldo_despues: number;
  creado_en: string;
}

export class MovimientoModel extends BaseModel {
  tabla = 'movimientos';
  columnas = ['id', 'usuario_id', 'partida_id', 'tipo', 'monto', 'saldo_despues', 'creado_en'] as const;
  filtrables = ['usuario_id', 'partida_id', 'tipo'];
  ordenables = ['creado_en', 'monto'];
  /** Solo los crea el servidor */
  crear = z.never();
  actualizar = z.never();
}

export const movimientoModel = new MovimientoModel();
