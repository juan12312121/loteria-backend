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
  /** '*' o lista separada por comas: https://loteria.vercel.app,http://localhost:5173 */
  CORS_ORIGEN: z
    .string()
    .default('*')
    .transform((v) => (v.trim() === '*' ? '*' : v.split(',').map((o) => o.trim()).filter(Boolean))),
});

const resultado = esquema.safeParse(process.env);
if (!resultado.success) {
  console.error('Variables de entorno inválidas:', resultado.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = resultado.data;
