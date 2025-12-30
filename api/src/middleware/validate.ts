import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { AppError } from './errorHandler';

type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Middleware factory for request validation using Zod schemas
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate ('body', 'params', or 'query')
 */
export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = formatZodErrors(result.error);
        throw new AppError(`Błędy walidacji: ${errors.join(', ')}`, 400);
      }

      // Replace with parsed data (handles transforms)
      req[target] = result.data;
      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        next(new AppError(`Błędy walidacji: ${errors.join(', ')}`, 400));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate multiple targets at once
 */
export const validateMultiple = (
  validations: Array<{ schema: ZodSchema; target: ValidationTarget }>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const allErrors: string[] = [];

      for (const { schema, target } of validations) {
        const result = schema.safeParse(req[target]);

        if (!result.success) {
          allErrors.push(...formatZodErrors(result.error));
        } else {
          req[target] = result.data;
        }
      }

      if (allErrors.length > 0) {
        throw new AppError(`Błędy walidacji: ${allErrors.join(', ')}`, 400);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(error);
      }
    }
  };
};

/**
 * Format Zod errors into readable messages
 */
function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((issue: ZodIssue) => {
    const path = issue.path.join('.');
    const message = issue.message;
    return path ? `${path}: ${message}` : message;
  });
}

// Convenience functions
export const validateBody = (schema: ZodSchema) => validate(schema, 'body');
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');
