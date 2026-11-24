export class AppError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST', details = undefined) {
    super(400, code, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND', details = undefined) {
    super(404, code, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'CONFLICT', details = undefined) {
    super(409, code, message, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(
    message = 'Service unavailable',
    code = 'SERVICE_UNAVAILABLE',
    details = undefined
  ) {
    super(503, code, message, details);
  }
}