import http from 'node:http';
import { app } from './app';
import { env } from './config/env';
import { pool } from './db/pool';
import { iniciarRealtime } from './juego/realtime';
import { realtimeDeps } from './container';

const servidor = http.createServer(app);
iniciarRealtime(servidor, realtimeDeps.salaRepo);

servidor.listen(env.PORT, () => console.log(`Lotería API en http://localhost:${env.PORT}`));

async function apagar() {
  console.log('apagando...');
  servidor.close();
  await pool.end();
  process.exit(0);
}
process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
