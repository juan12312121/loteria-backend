import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFound } from './core/middleware/errorHandler';
import { limiteGeneral } from './core/middleware/limites';
import { ApiResponse } from './core/http/ApiResponse';
import { rutas } from './container';

export const app = express();

// Render (y cualquier proxy) pone la IP real en X-Forwarded-For: necesario para los límites por IP
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGEN }));
app.use(express.json({ limit: '100kb' }));

app.get('/', (_req, res) => ApiResponse.ok(res, { nombre: 'Lotería API', version: '2.0.0' }));
app.get('/salud', (_req, res) => ApiResponse.ok(res, { ok: true, hora: new Date().toISOString() }));

app.use(limiteGeneral);
for (const [prefijo, router] of Object.entries(rutas)) app.use(prefijo, router);

app.use(notFound);
app.use(errorHandler);
