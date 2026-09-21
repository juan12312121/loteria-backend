import { EventEmitter } from 'node:events';

/**
 * Bus interno: los servicios publican eventos de juego y realtime.ts
 * los reenvía al cuarto de Socket.IO de la sala. Así los servicios no
 * dependen de Socket.IO.
 */
export type EventoJuego =
  | 'carta:cantada'
  | 'figura:lograda'
  | 'partida:estado'
  | 'partida:tablas'
  | 'partida:ganadores'
  | 'jugador:entro'
  | 'jugador:salio';

class BusJuego extends EventEmitter {
  emitir(salaId: string, evento: EventoJuego, datos: unknown) {
    this.emit('sala', { salaId, evento, datos });
  }
}

export const bus = new BusJuego();
