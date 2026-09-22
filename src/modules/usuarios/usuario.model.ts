import { z } from 'zod';
import { BaseModel } from '../../core/model/BaseModel';

export type Rol = 'jugador' | 'admin' | 'bot';
export const TIPOS_SKIN = ['ficha', 'carta', 'avatar', 'fondo', 'tema'] as const;
export type TipoSkin = (typeof TIPOS_SKIN)[number];

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  fichas: number;
  puntos: number;
  racha: number;
  skin_ficha_id: string | null;
  skin_carta_id: string | null;
  skin_avatar_id: string | null;
  skin_fondo_id: string | null;
  skin_tema_id: string | null;
  codigo_amigo: string;
  conectado: boolean;
  dias_seguidos: number;
  ultimo_banco: string | null;
  nivel_cobrado: number;
  ultimo_diario: string | null;
  mejor_racha: number;
  creado_en: string;
  actualizado_en: string;
}

export class UsuarioModel extends BaseModel {
  tabla = 'usuarios';
  columnas = [
    'id', 'nombre', 'correo', 'password_hash', 'rol', 'fichas', 'puntos', 'racha',
    'skin_ficha_id', 'skin_carta_id', 'skin_avatar_id', 'skin_fondo_id', 'skin_tema_id',
    'codigo_amigo', 'conectado', 'visto_en', 'dias_seguidos', 'ultimo_diario', 'ultimo_banco',
    'mejor_racha', 'nivel_cobrado', 'creado_en', 'actualizado_en',
  ] as const;
  ocultas = ['password_hash'];
  filtrables = ['rol', 'correo'];
  ordenables = ['creado_en', 'nombre', 'fichas', 'puntos'];
  crear = z.object({
    nombre: z.string().trim().min(2).max(60),
    correo: z.string().trim().toLowerCase().email(),
    password: z.string().min(6),
  });
  actualizar = z.object({
    nombre: z.string().trim().min(2).max(60).optional(),
    rol: z.enum(['jugador', 'admin']).optional(),
    fichas: z.number().int().min(0).optional(),
    puntos: z.number().int().min(0).optional(),
  });
}

export const usuarioModel = new UsuarioModel();

/** Columna de usuarios donde se guarda la skin equipada de cada tipo. */
export const columnaSkin = (tipo: TipoSkin) => `skin_${tipo}_id` as const;
