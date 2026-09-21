import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { verificarToken } from '../core/middleware/auth';
import { env } from '../config/env';
import { SalaRepository } from '../modules/salas/sala.repository';
import { bus } from './bus';
import { esFrase } from './Progreso';

/** Una frase del chat rápido cada tanto por jugador, para que nadie haga spam. */
const ESPERA_FRASE_MS = 1500;

const cuarto = (salaId: string) => `sala:${salaId}`;

/**
 * Socket.IO: un cuarto por sala. El cliente manda el JWT en handshake.auth.token
 * y emite "sala:unirse" con el id de la sala. Varias salas juegan a la vez sin
 * estorbarse: cada evento del bus va solo al cuarto de su sala.
 */
export function iniciarRealtime(http: HttpServer, salas: SalaRepository) {
  const io = new Server(http, { cors: { origin: env.CORS_ORIGEN } });

  io.use((socket, next) => {
    try {
      socket.data.actor = verificarToken(String(socket.handshake.auth?.token ?? ''));
      next();
    } catch (e) {
      next(e as Error);
    }
  });

  io.on('connection', (socket: Socket) => {
    const usuarioId: string = socket.data.actor.id;

    socket.on('sala:unirse', async (salaId: string) => {
      if (!(await salas.esMiembro(salaId, usuarioId))) return socket.emit('error', { mensaje: 'No estás en esa sala' });
      await socket.join(cuarto(salaId));
      await salas.marcarConectado(salaId, usuarioId, true);
      io.to(cuarto(salaId)).emit('jugador:conectado', { usuarioId });
    });

    /** Chat rápido: solo frases fijas (se manda la clave), a quien esté en el cuarto de la sala. */
    socket.on('sala:frase', (datos: { salaId?: string; clave?: string }) => {
      const salaId = String(datos?.salaId ?? '');
      if (!socket.rooms.has(cuarto(salaId)) || !esFrase(datos?.clave)) return;
      const ahora = Date.now();
      if (ahora - (socket.data.ultimaFrase ?? 0) < ESPERA_FRASE_MS) return;
      socket.data.ultimaFrase = ahora;
      io.to(cuarto(salaId)).emit('sala:frase', { usuarioId, clave: datos.clave, en: ahora });
    });

    socket.on('sala:salir', async (salaId: string) => {
      await socket.leave(cuarto(salaId));
      await salas.marcarConectado(salaId, usuarioId, false);
      io.to(cuarto(salaId)).emit('jugador:desconectado', { usuarioId });
    });

    socket.on('disconnect', () => salas.desconectarDeTodas(usuarioId));
  });

  bus.on('sala', ({ salaId, evento, datos }) => io.to(cuarto(salaId)).emit(evento, datos));

  return io;
}
