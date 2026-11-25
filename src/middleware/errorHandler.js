import { ZodError } from 'zod';
import { AppError, BadRequestError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

function mapError(err) {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    return new BadRequestError('Validation failed', 'VALIDATION_ERROR', details);
  }

  if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    return new BadRequestError('Malformed JSON payload', 'INVALID_JSON');
  }

  if (err?.code === '23503') {
    return new BadRequestError(
      'Referenced resource does not exist',
      'FOREIGN_KEY_VIOLATION'
    );
  }

  return null;
}

export function errorHandler(err, _req, res, _next) {
  const mapped = mapError(err);

  if (mapped) {
    const payload = {
      error: {
        code: mapped.code,
        message: mapped.message,
        ...(mapped.details !== undefined ? { details: mapped.details } : {}),
      },
    };
    return res.status(mapped.statusCode).json(payload);
  }

  logger.error('Unhandled application error', {
    message: err?.message,
    stack: err?.stack,
  });

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}