import { env } from '../config/env';

const UNA_HORA = 60 * 60 * 1000;
const DIEZ_MINUTOS = 10 * 60 * 1000;

interface Dependencias {
  premiarSemanaPasada: () => Promise<{ semana: string; ganadores: unknown[] } | null>;
}

/**
 * Tareas periódicas del servidor:
 * - Premia el ranking de la semana pasada (idempotente: se puede correr cada hora).
 * - En Render (plan gratis) se hace ping a sí mismo para no dormirse a los 15 min.
 */
export function programarTareas({ premiarSemanaPasada }: Dependencias) {
  const premiar = async () => {
    try {
      const r = await premiarSemanaPasada();
      if (r) console.log(`ranking de la semana ${r.semana} premiado (${r.ganadores.length} ganadores)`);
    } catch (e) {
      console.error('premiar semana', e);
    }
  };
  void premiar();
  const timers = [setInterval(premiar, UNA_HORA)];

  if (env.RENDER_EXTERNAL_URL) {
    const url = `${env.RENDER_EXTERNAL_URL.replace(/\/$/, '')}/salud`;
    timers.push(setInterval(() => fetch(url).catch(() => undefined), DIEZ_MINUTOS));
  }
  return () => timers.forEach(clearInterval);
}
