import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import healthRoutes from './routes/health.routes.js';
import eventsRoutes from './routes/events.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openapiPath = path.resolve(__dirname, '../openapi.yaml');
const openapiDocument = YAML.parse(fs.readFileSync(openapiPath, 'utf8'));

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '100kb' }));

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

  app.use(healthRoutes);
  app.use('/events', eventsRoutes);
  app.use('/bookings', bookingsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();