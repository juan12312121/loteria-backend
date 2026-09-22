import { BaseRepository } from '../../core/repository/BaseRepository';
import { JugadorSala, Sala } from './sala.model';

export class SalaRepository extends BaseRepository<Sala> {
  porCodigo(codigo: string) {
    return this.buscarUno({ codigo: codigo.toUpperCase() });
  }

  /** El hash de la contraseña (única consulta que lo lee). */
  async passwordDe(salaId: string) {
    const r = await this.fila<{ password_hash: string | null }>('SELECT password_hash FROM salas WHERE id = $1', [salaId]);
    return r?.password_hash ?? null;
  }

  async esMiembro(salaId: string, usuarioId: string) {
    return (await this.ejecutar('SELECT 1 FROM sala_jugadores WHERE sala_id = $1 AND usuario_id = $2', [salaId, usuarioId])) > 0;
  }

  async contarJugadores(salaId: string) {
    const r = await this.fila<{ n: number }>('SELECT count(*)::int AS n FROM sala_jugadores WHERE sala_id = $1', [salaId]);
    return r!.n;
  }

  agregarJugador(salaId: string, usuarioId: string, rol: JugadorSala['rol'] = 'jugador') {
    return this.ejecutar('INSERT INTO sala_jugadores (sala_id, usuario_id, rol) VALUES ($1,$2,$3)', [salaId, usuarioId, rol]);
  }

  quitarJugador(salaId: string, usuarioId: string) {
    return this.ejecutar('DELETE FROM sala_jugadores WHERE sala_id = $1 AND usuario_id = $2', [salaId, usuarioId]);
  }

  marcarConectado(salaId: string, usuarioId: string, conectado: boolean) {
    return this.ejecutar('UPDATE sala_jugadores SET conectado = $3 WHERE sala_id = $1 AND usuario_id = $2', [salaId, usuarioId, conectado]);
  }

  desconectarDeTodas(usuarioId: string) {
    return this.ejecutar('UPDATE sala_jugadores SET conectado = false WHERE usuario_id = $1', [usuarioId]);
  }

  jugadores(salaId: string) {
    return this.filas<JugadorSala>(
      `SELECT u.id, u.nombre, sj.rol, (sj.conectado OR u.rol = 'bot') AS conectado, sj.unido_en,
              u.rol = 'bot' AS bot, sa.clave AS avatar
       FROM sala_jugadores sj JOIN usuarios u ON u.id = sj.usuario_id
       LEFT JOIN skins sa ON sa.id = u.skin_avatar_id
       WHERE sj.sala_id = $1 ORDER BY sj.unido_en`,
      [salaId],
    );
  }

  /** Salas abiertas donde participo, con cuántos jugadores tiene cada una. */
  mias(usuarioId: string) {
    return this.filas<Sala & { mi_rol: string; jugadores: number }>(
      `SELECT ${this.model.select('s')}, sj.rol AS mi_rol, (s.password_hash IS NOT NULL) AS con_password,
              (SELECT count(*)::int FROM sala_jugadores x WHERE x.sala_id = s.id) AS jugadores
       FROM salas s JOIN sala_jugadores sj ON sj.sala_id = s.id
       WHERE sj.usuario_id = $1 AND s.estado <> 'cerrada' ORDER BY s.creado_en DESC`,
      [usuarioId],
    );
  }

  async botsDe(salaId: string) {
    const r = await this.filas<{ id: string }>(
      `SELECT u.id FROM sala_jugadores sj JOIN usuarios u ON u.id = sj.usuario_id WHERE sj.sala_id = $1 AND u.rol = 'bot'`,
      [salaId],
    );
    return r.map((x) => x.id);
  }

  /** Salas públicas recientes para unirse sin código, con anfitrión y ocupación. */
  publicas(usuarioId: string) {
    return this.filas<Sala & { anfitrion: string; jugadores: number; soy_miembro: boolean }>(
      `SELECT ${this.model.select('s')}, u.nombre AS anfitrion,
              (SELECT count(*)::int FROM sala_jugadores x WHERE x.sala_id = s.id) AS jugadores,
              (s.password_hash IS NOT NULL) AS con_password,
              exists(SELECT 1 FROM sala_jugadores x WHERE x.sala_id = s.id AND x.usuario_id = $1) AS soy_miembro
       FROM salas s JOIN usuarios u ON u.id = s.anfitrion_id
       WHERE NOT s.privada AND s.estado <> 'cerrada' AND s.creado_en > now() - interval '3 days'
       ORDER BY (s.estado = 'abierta') DESC, s.creado_en DESC LIMIT 30`,
      [usuarioId],
    );
  }

  marcarJugando(salaId: string) {
    return this.ejecutar(`UPDATE salas SET estado = 'jugando' WHERE id = $1`, [salaId]);
  }

  /** Al terminar o cancelar una ronda la sala vuelve a estar abierta. */
  liberar(salaId: string) {
    return this.ejecutar(`UPDATE salas SET estado = 'abierta' WHERE id = $1 AND estado = 'jugando'`, [salaId]);
  }
}
