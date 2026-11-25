import { app } from './app.js';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';

app.listen(config.port, () => {
  logger.info('Gatekeeper API listening', {
    port: config.port,
    env: config.nodeEnv,
  });
});