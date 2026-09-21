import { z } from 'zod';
import { BaseModel } from '../../core/model/BaseModel';

export type Rol = 'jugador' | 'admin';
export type TipoSkin = 'ficha' | 'carta';

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
  creado_en: string;
  actualizado_en: string;
}

export class UsuarioModel extends BaseModel {
  tabla = 'usuarios';
  columnas = [
    'id', 'nombre', 'correo', 'password_hash', 'rol', 'fichas', 'puntos', 'racha',
    'skin_ficha_id', 'skin_carta_id', 'creado_en', 'actualizado_en',
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
export const columnaSkin = (tipo: TipoSkin) => (tipo === 'ficha' ? 'skin_ficha_id' : 'skin_carta_id');
