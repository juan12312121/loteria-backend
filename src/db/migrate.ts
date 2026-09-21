import fs from 'node:fs';
import path from 'node:path';
import { pool } from './pool';

/** Corre en orden los .sql de migrations/ que no se hayan aplicado. */
async function main() {
  await pool.query(`CREATE TABLE IF NOT EXISTS _migraciones (
    nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())`);
  const dir = path.join(__dirname, 'migrations');
  const archivos = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const { rows } = await pool.query<{ nombre: string }>('SELECT nombre FROM _migraciones');
  const hechas = new Set(rows.map((r) => r.nombre));
  for (const archivo of archivos) {
    if (hechas.has(archivo)) continue;
    const sql = fs.readFileSync(path.join(dir, archivo), 'utf8');
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(sql);
      await c.query('INSERT INTO _migraciones (nombre) VALUES ($1)', [archivo]);
      await c.query('COMMIT');
      console.log('aplicada', archivo);
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  }
  await pool.end();
  console.log('migraciones al día');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
