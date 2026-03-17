import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../utils/errors';

/**
 * Middleware factory that validates request body against a Zod schema.
 * Attaches the parsed data to `req.body` if valid.
 */
export function validateBody(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const flat = z.flattenError(result.error);
      const details = Object.entries(flat.fieldErrors).map(([field, messages]) => ({
        field,
        message: (messages as string[])[0] || 'Invalid value',
      }));
      const message = details.length > 0 ? details[0].message : 'Invalid request body';
      return next(new ValidationError(message, details));
    }
    req.body = result.data;
    next();
  };
}

/**
 * Middleware factory that validates request query params against a Zod schema.
 */
export function validateQuery(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const flat = z.flattenError(result.error);
      const details = Object.entries(flat.fieldErrors).map(([field, messages]) => ({
        field,
        message: (messages as string[])[0] || 'Invalid value',
      }));
      const message = details.length > 0 ? details[0].message : 'Invalid query parameters';
      return next(new ValidationError(message, details));
    }
    Object.assign(req.query, result.data);
    next();
  };
}
