import 'dotenv/config';
import { z } from 'zod';

const esquema = z.object({
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().default('postgres'),
  DB_SSL: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRA: z.string().default('7d'),
  /**
   * '*' o lista separada por comas. Una entrada con * es un comodín para un
   * segmento del dominio: https://web-*-mi-equipo.vercel.app acepta las URLs
   * de rama y de cada deploy de Vercel de ese proyecto.
   */
  CORS_ORIGEN: z
    .string()
    .default('*')
    .transform((v) => (v.trim() === '*' ? '*' : v.split(',').map((o) => o.trim()).filter(Boolean).map(aOrigen))),
  /** Render la pone sola: URL pública del servicio. Si existe, el servidor se hace ping para no dormirse. */
  RENDER_EXTERNAL_URL: z.string().url().optional(),
});

/** 'https://web-*-equipo.vercel.app' → /^https:\/\/web-[a-z0-9-]+-equipo\.vercel\.app$/ */
function aOrigen(patron: string): string | RegExp {
  if (!patron.includes('*')) return patron;
  const escapado = patron.replace(/[.+?^${}()|[\]\\/]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+');
  return new RegExp(`^${escapado}$`, 'i');
}

const resultado = esquema.safeParse(process.env);
if (!resultado.success) {
  console.error('Variables de entorno inválidas:', resultado.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = resultado.data;
