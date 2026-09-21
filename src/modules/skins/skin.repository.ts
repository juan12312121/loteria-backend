import { BaseRepository } from '../../core/repository/BaseRepository';
import { TipoSkin } from '../usuarios/usuario.model';
import { Equipo, Skin, SkinResumen } from './skin.model';

export class SkinRepository extends BaseRepository<Skin> {
  /** Catálogo activo con marcas de "la tengo" y "equipada" para un usuario. */
  catalogo(usuarioId: string, tipo?: TipoSkin) {
    return this.filas(
      `SELECT ${this.model.select('s')}, (us.skin_id IS NOT NULL) AS la_tengo,
              (u.skin_ficha_id = s.id OR u.skin_carta_id = s.id) AS equipada
       FROM skins s CROSS JOIN usuarios u
       LEFT JOIN usuario_skins us ON us.skin_id = s.id AND us.usuario_id = u.id
       WHERE u.id = $1 AND s.activa AND ($2::text IS NULL OR s.tipo = $2)
       ORDER BY s.tipo, s.precio_puntos, s.nombre`,
      [usuarioId, tipo ?? null],
    );
  }

  deUsuario(usuarioId: string) {
    return this.filas(
      `SELECT ${this.model.select('s')}, us.obtenido_en, (u.skin_ficha_id = s.id OR u.skin_carta_id = s.id) AS equipada
       FROM usuario_skins us JOIN skins s ON s.id = us.skin_id JOIN usuarios u ON u.id = us.usuario_id
       WHERE us.usuario_id = $1 ORDER BY s.tipo, us.obtenido_en DESC`,
      [usuarioId],
    );
  }

  async laTiene(usuarioId: string, skinId: string) {
    return (await this.ejecutar('SELECT 1 FROM usuario_skins WHERE usuario_id = $1 AND skin_id = $2', [usuarioId, skinId])) > 0;
  }

  otorgar(usuarioId: string, skinId: string) {
    return this.ejecutar('INSERT INTO usuario_skins (usuario_id, skin_id) VALUES ($1,$2)', [usuarioId, skinId]);
  }

  async equipoDe(usuarioId: string): Promise<Equipo> {
    const r = await this.fila(
      `SELECT f.id AS f_id, f.clave AS f_clave, f.nombre AS f_nombre, f.imagen_url AS f_img,
              c.id AS c_id, c.clave AS c_clave, c.nombre AS c_nombre, c.imagen_url AS c_img
       FROM usuarios u LEFT JOIN skins f ON f.id = u.skin_ficha_id LEFT JOIN skins c ON c.id = u.skin_carta_id
       WHERE u.id = $1`,
      [usuarioId],
    );
    const resumen = (id: string | null, clave: string, nombre: string, img: string | null): SkinResumen | null =>
      id ? { id, clave, nombre, imagen_url: img } : null;
    return {
      ficha: r ? resumen(r.f_id, r.f_clave, r.f_nombre, r.f_img) : null,
      carta: r ? resumen(r.c_id, r.c_clave, r.c_nombre, r.c_img) : null,
    };
  }
}
