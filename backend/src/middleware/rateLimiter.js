const { RateLimiterMemory } = require('rate-limiter-flexible');

// Different rate limits for different endpoints
const rateLimiters = {
  // General API rate limiter
  general: new RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Number of requests
    duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 || 900, // Per 15 minutes (in seconds)
    blockDuration: 60, // Block for 1 minute if limit exceeded
  }),

  // Email processing rate limiter (more restrictive)
  emailProcessing: new RateLimiterMemory({
    keyGenerator: (req) => req.userId || req.ip,
    points: process.env.NODE_ENV === 'development' ? 100 : 10, // 100 in dev, 10 in prod
    duration: process.env.NODE_ENV === 'development' ? 60 : 300, // 1 min in dev, 5 min in prod
    blockDuration: process.env.NODE_ENV === 'development' ? 10 : 300, // 10 sec in dev, 5 min in prod
  }),

  // Authentication rate limiter
  auth: new RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: 5, // 5 attempts
    duration: 900, // per 15 minutes
    blockDuration: 900, // Block for 15 minutes
  })
};

/**
 * Create rate limiter middleware
 */
const createRateLimitMiddleware = (limiterType = 'general') => {
  return async (req, res, next) => {
    try {
      const limiter = rateLimiters[limiterType];
      if (!limiter) {
        console.error(`Rate limiter type '${limiterType}' not found`);
        return next();
      }

      const key = limiter.keyGenerator(req);
      console.log(`🚦 Rate limit check for ${limiterType}: key=${key}, path=${req.path}`);
      
      await limiter.consume(key);
      console.log(`✅ Rate limit passed for ${limiterType}`);
      next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      console.log(`❌ Rate limit exceeded for ${limiterType}: ${rejRes.remainingPoints} points left, retry in ${secs}s`);
      
      res.set('Retry-After', String(secs));
      
      res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: secs
      });
    }
  };
};

// Default rate limiter middleware
const rateLimiter = createRateLimitMiddleware('general');

module.exports = rateLimiter;
module.exports.createRateLimitMiddleware = createRateLimitMiddleware;