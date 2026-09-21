import { z } from 'zod';
import { BaseModel } from '../../core/model/BaseModel';
import { TIPOS_SKIN, TipoSkin } from '../usuarios/usuario.model';

export type Rareza = 'comun' | 'rara' | 'epica' | 'legendaria';

export interface Skin {
  id: string;
  tipo: TipoSkin;
  clave: string;
  nombre: string;
  descripcion: string;
  imagen_url: string | null;
  precio_puntos: number;
  rareza: Rareza;
  activa: boolean;
  /** 'MM-DD'; null = siempre a la venta */
  temporada_inicio: string | null;
  temporada_fin: string | null;
  /** Solo se gana (misión o ranking), no se compra */
  exclusiva: boolean;
  creado_en: string;
}

export interface SkinResumen {
  id: string;
  clave: string;
  nombre: string;
  imagen_url: string | null;
}

export type Equipo = Record<TipoSkin, SkinResumen | null>;

export class SkinModel extends BaseModel {
  tabla = 'skins';
  columnas = [
    'id', 'tipo', 'clave', 'nombre', 'descripcion', 'imagen_url', 'precio_puntos', 'rareza', 'activa',
    'temporada_inicio', 'temporada_fin', 'exclusiva', 'creado_en',
  ] as const;
  filtrables = ['tipo', 'rareza', 'activa', 'clave'];
  ordenables = ['creado_en', 'precio_puntos', 'nombre'];
  ordenDefault = 'precio_puntos';
  crear = z.object({
    tipo: z.enum(TIPOS_SKIN),
    clave: z.string().regex(/^[a-z0-9_]+$/),
    nombre: z.string().min(1).max(60),
    descripcion: z.string().default(''),
    imagen_url: z.string().url().nullable().optional(),
    precio_puntos: z.number().int().min(0).default(0),
    rareza: z.enum(['comun', 'rara', 'epica', 'legendaria']).default('comun'),
    activa: z.boolean().default(true),
    temporada_inicio: z.string().regex(/^\d{2}-\d{2}$/).nullable().optional(),
    temporada_fin: z.string().regex(/^\d{2}-\d{2}$/).nullable().optional(),
    exclusiva: z.boolean().default(false),
  });
  actualizar = this.crear.partial();
}

export const skinModel = new SkinModel();
