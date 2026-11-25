import express from 'express';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '100kb' }));


  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();