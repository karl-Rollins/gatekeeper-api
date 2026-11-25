import express from 'express';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import eventsRoutes from './routes/events.routes.js';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '100kb' }));

  app.use(healthRoutes);
  app.use('/events', eventsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();