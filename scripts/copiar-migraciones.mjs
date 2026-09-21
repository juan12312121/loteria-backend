// tsc no copia los .sql: los llevamos a dist para poder migrar en producción sin tsx.
import { cpSync } from 'node:fs';

cpSync('src/db/migrations', 'dist/db/migrations', { recursive: true });
console.log('migraciones copiadas a dist/db/migrations');
