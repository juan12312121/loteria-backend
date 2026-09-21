import { pool } from './pool';
import { CARTAS } from '../juego/cartas';
import { FIGURAS } from '../juego/MotorLoteria';
import { generarTabla } from '../juego/MotorLoteria';
import { SKINS } from '../juego/skins';
import { BOTS } from '../juego/Progreso';

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
      `INSERT INTO skins (tipo, clave, nombre, descripcion, precio_puntos, rareza, temporada_inicio, temporada_fin, exclusiva)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (clave) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion,
       precio_puntos = EXCLUDED.precio_puntos, rareza = EXCLUDED.rareza, temporada_inicio = EXCLUDED.temporada_inicio,
       temporada_fin = EXCLUDED.temporada_fin, exclusiva = EXCLUDED.exclusiva`,
      [s.tipo, s.clave, s.nombre, s.descripcion, s.precio_puntos, s.rareza, s.temporada?.[0] ?? null, s.temporada?.[1] ?? null, !!s.exclusiva],
    );
  }
  // Bots: cuentas que no pueden iniciar sesión (hash imposible) con su avatar puesto
  for (const [i, b] of BOTS.entries()) {
    await pool.query(
      `INSERT INTO usuarios (nombre, correo, password_hash, rol, fichas, skin_avatar_id)
       VALUES ($1, $2, '!', 'bot', 1000000, (SELECT id FROM skins WHERE clave = $3))
       ON CONFLICT (correo) DO UPDATE SET nombre = EXCLUDED.nombre, skin_avatar_id = EXCLUDED.skin_avatar_id,
       fichas = greatest(usuarios.fichas, 100000)`,
      [b.nombre, `bot${i + 1}@bots.loteria`, b.avatar],
    );
  }
  await pool.end();
  console.log(`semillas listas: 54 cartas, ${FIGURAS.length} figuras, ${SKINS.length} skins, ${BOTS.length} bots`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
