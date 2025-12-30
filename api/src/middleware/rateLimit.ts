import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * Limits each IP to 100 requests per 15 minutes
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits each IP to 5 login attempts per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  message: {
    success: false,
    error: 'Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests against the limit
});

/**
 * Rate limiter for password change
 * Limits each IP to 3 password changes per hour
 */
export const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 attempts per hour
  message: {
    success: false,
    error: 'Zbyt wiele prób zmiany hasła. Spróbuj ponownie za godzinę.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for file uploads
 * Limits each IP to 20 uploads per hour
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 uploads per hour
  message: {
    success: false,
    error: 'Zbyt wiele przesłanych plików. Spróbuj ponownie za godzinę.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for external API calls (like Apaczka)
 * Limits each IP to 30 requests per minute
 */
export const externalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: {
    success: false,
    error: 'Zbyt wiele żądań do zewnętrznego API. Spróbuj ponownie za minutę.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
