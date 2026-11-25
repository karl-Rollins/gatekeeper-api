import { BadRequestError } from "../errors/AppError.js";

function formatZodIssues(zodError) {
  return zodError.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}

function assignParsed(req, key, value) {
  try {
    req[key] = value;
  } catch {
    Object.defineProperty(req, key, {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
}

export function validate({ params, query, body } = {}) {
  return (req, _res, next) => {
    try {
      if (params) {
        const parsed = params.safeParse(req.params);
        if (!parsed.success) {
          return next(
            new BadRequestError(
              "Invalid path parameters",
              "VALIDATION_ERROR",
              formatZodIssues(parsed.error),
            ),
          );
        }
        assignParsed(req, "params", parsed.data);
      }

      if (query) {
        const parsed = query.safeParse(req.query);
        if (!parsed.success) {
          return next(
            new BadRequestError(
              "Invalid query parameters",
              "VALIDATION_ERROR",
              formatZodIssues(parsed.error),
            ),
          );
        }
        assignParsed(req, "query", parsed.data);
      }

      if (body) {
        const parsed = body.safeParse(req.body);
        if (!parsed.success) {
          return next(
            new BadRequestError(
              "Invalid request body",
              "VALIDATION_ERROR",
              formatZodIssues(parsed.error),
            ),
          );
        }
        assignParsed(req, "body", parsed.data);
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}
