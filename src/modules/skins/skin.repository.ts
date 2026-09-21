import { BaseRepository } from '../../core/repository/BaseRepository';
import { TIPOS_SKIN, TipoSkin } from '../usuarios/usuario.model';
import { Equipo, Skin, SkinResumen } from './skin.model';

/** ¿La skin s es la que el usuario u trae puesta? */
const EQUIPADA = `coalesce(s.id IN (u.skin_ficha_id, u.skin_carta_id, u.skin_avatar_id, u.skin_fondo_id), false)`;

export class SkinRepository extends BaseRepository<Skin> {
  /** Catálogo activo con marcas de "la tengo" y "equipada" para un usuario. */
  catalogo(usuarioId: string, tipo?: TipoSkin) {
    return this.filas<Skin & { la_tengo: boolean; equipada: boolean }>(
      `SELECT ${this.model.select('s')}, (us.skin_id IS NOT NULL) AS la_tengo, ${EQUIPADA} AS equipada
       FROM skins s CROSS JOIN usuarios u
       LEFT JOIN usuario_skins us ON us.skin_id = s.id AND us.usuario_id = u.id
       WHERE u.id = $1 AND s.activa AND ($2::text IS NULL OR s.tipo = $2)
       ORDER BY s.tipo, s.exclusiva, s.precio_puntos, s.nombre`,
      [usuarioId, tipo ?? null],
    );
  }

  deUsuario(usuarioId: string) {
    return this.filas(
      `SELECT ${this.model.select('s')}, us.obtenido_en, ${EQUIPADA} AS equipada
       FROM usuario_skins us JOIN skins s ON s.id = us.skin_id JOIN usuarios u ON u.id = us.usuario_id
       WHERE us.usuario_id = $1 ORDER BY s.tipo, us.obtenido_en DESC`,
      [usuarioId],
    );
  }

  /** Cuántas skins tiene de cuántas hay, por tipo (para el álbum). */
  coleccion(usuarioId: string) {
    return this.filas<{ tipo: TipoSkin; tengo: number; total: number }>(
      `SELECT s.tipo, count(us.skin_id)::int AS tengo, count(*)::int AS total
       FROM skins s LEFT JOIN usuario_skins us ON us.skin_id = s.id AND us.usuario_id = $1
       WHERE s.activa GROUP BY s.tipo ORDER BY s.tipo`,
      [usuarioId],
    );
  }

  async laTiene(usuarioId: string, skinId: string) {
    return (await this.ejecutar('SELECT 1 FROM usuario_skins WHERE usuario_id = $1 AND skin_id = $2', [usuarioId, skinId])) > 0;
  }

  otorgar(usuarioId: string, skinId: string) {
    return this.ejecutar('INSERT INTO usuario_skins (usuario_id, skin_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [usuarioId, skinId]);
  }

  porClave(clave: string) {
    return this.buscarUno({ clave });
  }

  async equipoDe(usuarioId: string): Promise<Equipo> {
    const filas = await this.filas<{ tipo: TipoSkin } & SkinResumen>(
      `SELECT s.tipo, s.id, s.clave, s.nombre, s.imagen_url FROM usuarios u
       JOIN skins s ON s.id IN (u.skin_ficha_id, u.skin_carta_id, u.skin_avatar_id, u.skin_fondo_id)
       WHERE u.id = $1`,
      [usuarioId],
    );
    const equipo = Object.fromEntries(TIPOS_SKIN.map((t) => [t, null])) as Equipo;
    for (const { tipo, ...resumen } of filas) equipo[tipo] = resumen;
    return equipo;
  }
}
