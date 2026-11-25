import { NotFoundError } from '../errors/AppError.js';

export function notFoundHandler(req, _res, next) {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`, 'NOT_FOUND'));
}