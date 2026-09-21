import { Pool, PoolClient } from 'pg';
import { env } from '../config/env';

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

/** Un Pool o un cliente dentro de una transacción: ambos tienen .query */
export type Db = Pool | PoolClient;

/** Ejecuta fn dentro de una transacción; hace rollback si truena. */
export async function transaccion<T>(fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const r = await fn(cliente);
    await cliente.query('COMMIT');
    return r;
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
}
