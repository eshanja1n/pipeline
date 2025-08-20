const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandlers');
const queueService = require('../services/queueService');

const router = express.Router();

// All queue routes require authentication
router.use(authenticateToken);

/**
 * Get queue statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await queueService.getQueueStats();
  res.json({ stats });
}));

/**
 * Get job status
 */
router.get('/job/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { type = 'sync' } = req.query;

  const status = await queueService.getJobStatus(jobId, type);
  res.json({ job: status });
}));

/**
 * Cancel a job
 */
router.delete('/job/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { type = 'sync' } = req.query;

  const result = await queueService.cancelJob(jobId, type);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

/**
 * Queue email sync (alternative to direct sync)
 */
router.post('/sync', asyncHandler(async (req, res) => {
  const { access_token, options = {} } = req.body;

  if (!access_token) {
    return res.status(400).json({
      error: 'Gmail access token is required',
      code: 'MISSING_ACCESS_TOKEN'
    });
  }

  const result = await queueService.queueEmailSync(req.userId, access_token, options);
  
  res.json({
    message: 'Email sync queued',
    ...result
  });
}));

/**
 * Queue email analysis
 */
router.post('/analyze', asyncHandler(async (req, res) => {
  const { email_ids } = req.body;

  if (!Array.isArray(email_ids) || email_ids.length === 0) {
    return res.status(400).json({
      error: 'Email IDs array is required',
      code: 'MISSING_EMAIL_IDS'
    });
  }

  const result = await queueService.queueEmailAnalysis(req.userId, email_ids);
  
  res.json({
    message: 'Email analysis queued',
    ...result
  });
}));

/**
 * Get queue health status
 */
router.get('/health', asyncHandler(async (req, res) => {
  const health = await queueService.getHealth();
  
  if (health.healthy) {
    res.json(health);
  } else {
    res.status(503).json(health);
  }
}));

module.exports = router;