import { BaseRepository } from '../../core/repository/BaseRepository';
import { TipoSkin, Usuario, columnaSkin } from './usuario.model';

export type UsuarioConHash = Pick<Usuario, 'id' | 'nombre' | 'correo' | 'rol' | 'fichas' | 'puntos'> & { password_hash: string };

export class UsuarioRepository extends BaseRepository<Usuario> {
  /** Único lugar que lee el hash: solo para el login. */
  porCorreoConHash(correo: string) {
    return this.fila<UsuarioConHash>(
      'SELECT id, nombre, correo, rol, fichas, puntos, password_hash FROM usuarios WHERE correo = $1',
      [correo.toLowerCase()],
    );
  }

  /** Suma (o resta) fichas; null si el saldo quedaría negativo. */
  async sumarFichas(usuarioId: string, monto: number): Promise<number | null> {
    const r = await this.fila<{ fichas: number }>(
      `UPDATE usuarios SET fichas = fichas + $2, actualizado_en = now()
       WHERE id = $1 AND fichas + $2 >= 0 RETURNING fichas`,
      [usuarioId, monto],
    );
    return r?.fichas ?? null;
  }

  /** Suma (o resta) puntos sin bajar de 0. */
  async sumarPuntos(usuarioId: string, monto: number): Promise<number | null> {
    const r = await this.fila<{ puntos: number }>(
      `UPDATE usuarios SET puntos = greatest(0, puntos + $2), actualizado_en = now() WHERE id = $1 RETURNING puntos`,
      [usuarioId, monto],
    );
    return r?.puntos ?? null;
  }

  /** Cobra puntos; null si no le alcanza. */
  async cobrarPuntos(usuarioId: string, precio: number): Promise<number | null> {
    const r = await this.fila<{ puntos: number }>(
      `UPDATE usuarios SET puntos = puntos - $2, actualizado_en = now() WHERE id = $1 AND puntos >= $2 RETURNING puntos`,
      [usuarioId, precio],
    );
    return r?.puntos ?? null;
  }

  async racha(usuarioId: string): Promise<number> {
    const r = await this.fila<{ racha: number }>('SELECT racha FROM usuarios WHERE id = $1', [usuarioId]);
    return r?.racha ?? 0;
  }

  subirRacha(usuarioId: string) {
    return this.ejecutar('UPDATE usuarios SET racha = racha + 1 WHERE id = $1', [usuarioId]);
  }

  reiniciarRacha(usuarioId: string) {
    return this.ejecutar('UPDATE usuarios SET racha = 0 WHERE id = $1', [usuarioId]);
  }

  equipar(usuarioId: string, tipo: TipoSkin, skinId: string | null) {
    return this.ejecutar(`UPDATE usuarios SET ${columnaSkin(tipo)} = $2 WHERE id = $1`, [usuarioId, skinId]);
  }

  /** Equipa solo si no traía nada de ese tipo (primera skin que consigue). */
  equiparSiVacio(usuarioId: string, tipo: TipoSkin, skinId: string) {
    const col = columnaSkin(tipo);
    return this.ejecutar(`UPDATE usuarios SET ${col} = coalesce(${col}, $2) WHERE id = $1`, [usuarioId, skinId]);
  }

  ranking(limite: number) {
    return this.filas(
      `SELECT u.id, u.nombre, u.puntos, u.racha, sf.clave AS skin_ficha, sc.clave AS skin_carta
       FROM usuarios u LEFT JOIN skins sf ON sf.id = u.skin_ficha_id LEFT JOIN skins sc ON sc.id = u.skin_carta_id
       ORDER BY u.puntos DESC, u.nombre LIMIT $1`,
      [limite],
    );
  }
}
