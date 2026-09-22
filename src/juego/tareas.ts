import { env } from '../config/env';
import { diaLocal, ZONA_HORARIA } from './Progreso';

const UNA_HORA = 60 * 60 * 1000;
const DIEZ_MINUTOS = 10 * 60 * 1000;
const QUINCE_MINUTOS = 15 * 60 * 1000;
/** Hora de México a la que se manda el recordatorio de la recompensa diaria. */
const HORA_RECORDATORIO = 19;

interface Dependencias {
  premiarSemanaPasada: () => Promise<{ semana: string; ganadores: unknown[] } | null>;
  recordarDiario: () => Promise<number>;
}

/** Hora del día en México (0–23). */
const horaLocal = () =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: ZONA_HORARIA, hour: '2-digit', hour12: false }).format(new Date()));

/**
 * Tareas periódicas del servidor:
 * - Premia el ranking de la semana pasada (idempotente: se puede correr cada hora).
 * - En Render (plan gratis) se hace ping a sí mismo para no dormirse a los 15 min.
 */
export function programarTareas({ premiarSemanaPasada, recordarDiario }: Dependencias) {
  const premiar = async () => {
    try {
      const r = await premiarSemanaPasada();
      if (r) console.log(`ranking de la semana ${r.semana} premiado (${r.ganadores.length} ganadores)`);
    } catch (e) {
      console.error('premiar semana', e);
    }
  };
  void premiar();

  // Recordatorio de la tarde, una sola vez al día
  let recordado = '';
  const recordar = async () => {
    const hoy = diaLocal();
    if (recordado === hoy || horaLocal() !== HORA_RECORDATORIO) return;
    recordado = hoy;
    try {
      const n = await recordarDiario();
      if (n) console.log(`recordatorio de recompensa mandado a ${n} jugador(es)`);
    } catch (e) {
      console.error('recordar diario', e);
    }
  };

  const timers = [setInterval(premiar, UNA_HORA), setInterval(recordar, QUINCE_MINUTOS)];

  if (env.RENDER_EXTERNAL_URL) {
    const url = `${env.RENDER_EXTERNAL_URL.replace(/\/$/, '')}/salud`;
    timers.push(setInterval(() => fetch(url).catch(() => undefined), DIEZ_MINUTOS));
  }
  return () => timers.forEach(clearInterval);
}
