import { pool } from './pool';
import { CARTAS } from '../juego/cartas';
import { FIGURAS } from '../juego/MotorLoteria';
import { generarTabla } from '../juego/MotorLoteria';
import { SKINS } from '../juego/skins';

async function main() {
  for (const c of CARTAS) {
    await pool.query(
      `INSERT INTO cartas (id, nombre, verso) VALUES ($1,$2,$3)
       ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, verso = EXCLUDED.verso`,
      [c.id, c.nombre, c.verso],
    );
  }
  for (const f of FIGURAS) {
    await pool.query(
      `INSERT INTO figuras (clave, nombre, mascaras, descripcion, intermedia) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (clave) DO UPDATE SET nombre = EXCLUDED.nombre, mascaras = EXCLUDED.mascaras,
       descripcion = EXCLUDED.descripcion, intermedia = EXCLUDED.intermedia`,
      [f.clave, f.nombre, f.mascaras, f.descripcion, !!f.intermedia],
    );
  }
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM tablas WHERE oficial');
  if (rows[0].n === 0) {
    for (let i = 1; i <= 20; i++) {
      await pool.query(`INSERT INTO tablas (nombre, cartas, oficial) VALUES ($1,$2,true)`, [
        `Tabla ${i}`,
        generarTabla(),
      ]);
    }
    console.log('20 tablas oficiales creadas');
  }
  for (const s of SKINS) {
    await pool.query(
      `INSERT INTO skins (tipo, clave, nombre, descripcion, precio_puntos, rareza) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (clave) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion,
       precio_puntos = EXCLUDED.precio_puntos, rareza = EXCLUDED.rareza`,
      [s.tipo, s.clave, s.nombre, s.descripcion, s.precio_puntos, s.rareza],
    );
  }
  await pool.end();
  console.log(`semillas listas: 54 cartas, ${FIGURAS.length} figuras, ${SKINS.length} skins`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
