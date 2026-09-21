import { z } from 'zod';
import { BaseModel } from '../../core/model/BaseModel';

/** Una tabla que un jugador eligió para una partida. */
export interface PartidaTabla {
  id: string;
  partida_id: string;
  usuario_id: string;
  tabla_id: string;
  /** Frijolitos puestos por el jugador (bits 0–15). Solo visual. */
  marcas: number;
  /** Quemada por una lotería falsa */
  quemada: boolean;
  creado_en: string;
}

/** Tabla en juego con lo necesario para validar figuras. */
export interface TablaEnJuego {
  id: string;
  usuario_id: string;
  tabla_id: string;
  tabla: string;
  cartas: number[];
  nombre: string;
}

export class PartidaTablaModel extends BaseModel {
  tabla = 'partida_tablas';
  columnas = ['id', 'partida_id', 'usuario_id', 'tabla_id', 'marcas', 'quemada', 'creado_en'] as const;
  filtrables = ['partida_id', 'usuario_id'];
  crear = z.never();
  actualizar = z.never();
}

export const partidaTablaModel = new PartidaTablaModel();
