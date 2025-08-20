const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler } = require('../middleware/errorHandlers');

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/', asyncHandler(async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {}
  };

  // Check Supabase connection
  try {
    const { error } = await supabaseAdmin
      .from('jobs')
      .select('id')
      .limit(1);
    
    health.services.supabase = error ? 'unhealthy' : 'healthy';
    if (error) health.services.supabaseError = error.message;
  } catch (error) {
    health.services.supabase = 'unhealthy';
    health.services.supabaseError = error.message;
  }

  // Check Redis connection (if configured)
  if (process.env.REDIS_URL) {
    try {
      // TODO: Add Redis health check when we implement the queue
      health.services.redis = 'not_implemented';
    } catch (error) {
      health.services.redis = 'unhealthy';
      health.services.redisError = error.message;
    }
  }

  // Check AWS Bedrock (basic configuration check)
  health.services.aws = {
    region: process.env.AWS_REGION || 'not_configured',
    status: process.env.AWS_ACCESS_KEY_ID ? 'configured' : 'not_configured'
  };

  // Determine overall health
  const unhealthyServices = Object.values(health.services).filter(service => 
    typeof service === 'string' && service === 'unhealthy'
  );
  
  if (unhealthyServices.length > 0) {
    health.status = 'degraded';
    res.status(503);
  }

  res.json(health);
}));

/**
 * Readiness check (for Kubernetes)
 */
router.get('/ready', asyncHandler(async (req, res) => {
  // Check if all critical services are ready
  try {
    await supabaseAdmin.from('jobs').select('id').limit(1);
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ 
      status: 'not_ready', 
      error: error.message 
    });
  }
}));

/**
 * Liveness check (for Kubernetes)
 */
router.get('/live', (req, res) => {
  res.json({ status: 'alive' });
});

module.exports = router;