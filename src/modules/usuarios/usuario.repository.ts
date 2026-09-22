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
    return this.ejecutar('UPDATE usuarios SET racha = racha + 1, mejor_racha = greatest(mejor_racha, racha + 1) WHERE id = $1', [usuarioId]);
  }

  /**
   * Registra la recompensa diaria solo si hoy no la ha cobrado (a prueba de doble clic).
   * Devuelve los días seguidos resultantes o null si ya la cobró.
   */
  async registrarDiario(usuarioId: string, hoy: string, diasSeguidos: number): Promise<number | null> {
    const r = await this.fila<{ dias_seguidos: number }>(
      `UPDATE usuarios SET dias_seguidos = $3, ultimo_diario = $2::date
       WHERE id = $1 AND (ultimo_diario IS NULL OR ultimo_diario < $2::date) RETURNING dias_seguidos`,
      [usuarioId, hoy, diasSeguidos],
    );
    return r?.dias_seguidos ?? null;
  }

  /** Marca los niveles como cobrados; null si otro cobro se adelantó. */
  async marcarNivelCobrado(usuarioId: string, nivel: number): Promise<number | null> {
    const r = await this.fila<{ nivel_cobrado: number }>(
      'UPDATE usuarios SET nivel_cobrado = $2 WHERE id = $1 AND nivel_cobrado < $2 RETURNING nivel_cobrado',
      [usuarioId, nivel],
    );
    return r?.nivel_cobrado ?? null;
  }

/** Aparta el préstamo del banco de hoy (solo marca la fecha); false si no aplica. */
  async apartarBanco(usuarioId: string, hoy: string, minimo: number) {
    const r = await this.ejecutar(
      `UPDATE usuarios SET ultimo_banco = $2::date, actualizado_en = now()
       WHERE id = $1 AND fichas < $3 AND (ultimo_banco IS NULL OR ultimo_banco < $2::date)`,
      [usuarioId, hoy, minimo],
    );
    return r > 0;
  }

  /** Bots de la reserva que todavía no están en la sala. */
  botsLibres(salaId: string) {
    return this.filas<{ id: string; nombre: string }>(
      `SELECT u.id, u.nombre FROM usuarios u
       WHERE u.rol = 'bot' AND NOT EXISTS (SELECT 1 FROM sala_jugadores sj WHERE sj.sala_id = $1 AND sj.usuario_id = u.id)
       ORDER BY random()`,
      [salaId],
    );
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
      `SELECT u.id, u.nombre, u.puntos, u.racha, sf.clave AS skin_ficha, sc.clave AS skin_carta, sa.clave AS avatar
       FROM usuarios u LEFT JOIN skins sf ON sf.id = u.skin_ficha_id LEFT JOIN skins sc ON sc.id = u.skin_carta_id
       LEFT JOIN skins sa ON sa.id = u.skin_avatar_id
       WHERE u.rol <> 'bot' ORDER BY u.puntos DESC, u.nombre LIMIT $1`,
      [limite],
    );
  }
}
