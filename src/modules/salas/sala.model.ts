import { z } from 'zod';
import { BaseModel } from '../../core/model/BaseModel';

export type EstadoSala = 'abierta' | 'jugando' | 'cerrada';

export interface Sala {
  id: string;
  codigo: string;
  nombre: string;
  anfitrion_id: string;
  /** Figura que TERMINA la ronda (por defecto tabla llena) */
  figura_id: number;
  modo_cantor: 'automatico' | 'manual';
  velocidad_ms: number;
  max_jugadores: number;
  /** Fijo por las reglas del juego (REGLAS_SALA.costoTabla) */
  costo_tabla: number;
  privada: boolean;
  /** Si tiene contraseña, hay que escribirla para entrar (aparte del código) */
  password_hash: string | null;
  estado: EstadoSala;
  creado_en: string;
}

export interface JugadorSala {
  id: string;
  nombre: string;
  rol: 'anfitrion' | 'jugador';
  conectado: boolean;
  unido_en: string;
  bot: boolean;
  avatar: string | null;
}

export class SalaModel extends BaseModel {
  tabla = 'salas';
  columnas = [
    'id', 'codigo', 'nombre', 'anfitrion_id', 'figura_id', 'modo_cantor', 'velocidad_ms',
    'max_jugadores', 'costo_tabla', 'privada', 'password_hash', 'estado', 'creado_en',
  ] as const;
  filtrables = ['estado', 'privada', 'anfitrion_id', 'codigo'];
  ordenables = ['creado_en', 'nombre'];
  ocultas = ['password_hash'];
  crear = z.object({
    nombre: z.string().trim().min(1).max(60),
    password: z.string().trim().min(3).max(40).optional(),
    figura_id: z.number().int().positive().optional(),
    modo_cantor: z.enum(['automatico', 'manual']).default('automatico'),
    velocidad_ms: z.number().int().min(1000).max(60000).default(5000),
    max_jugadores: z.number().int().min(1).max(100).default(10),
    privada: z.boolean().default(false),
  });
  actualizar = this.crear.partial().extend({ estado: z.enum(['abierta', 'cerrada']).optional() });
}

export const salaModel = new SalaModel();
