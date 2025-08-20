const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { createRateLimitMiddleware } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandlers');
const gmailService = require('../services/gmailService');
const llmService = require('../services/llmService');

const router = express.Router();

// All email routes require authentication
router.use(authenticateToken);

// Apply email-specific rate limiting for processing endpoints (disabled in development)
if (process.env.NODE_ENV === 'production') {
  router.use('/process', createRateLimitMiddleware('emailProcessing'));
  router.use('/sync', createRateLimitMiddleware('emailProcessing'));
}

/**
 * Get email tracking history for the authenticated user
 */
router.get('/tracking', asyncHandler(async (req, res) => {
  const { 
    limit = 50, 
    offset = 0, 
    is_job_related, 
    is_processed 
  } = req.query;

  let query = supabaseAdmin
    .from('email_tracking')
    .select(`
      *,
      associated_job:jobs(id, company, role, status)
    `)
    .eq('user_id', req.userId)
    .order('received_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (is_job_related !== undefined) {
    query = query.eq('is_job_related', is_job_related === 'true');
  }

  if (is_processed !== undefined) {
    query = query.eq('is_processed', is_processed === 'true');
  }

  const { data: emails, error, count } = await query;

  if (error) {
    console.error('Error fetching email tracking:', error);
    return res.status(500).json({
      error: 'Failed to fetch email tracking',
      code: 'FETCH_EMAIL_TRACKING_ERROR'
    });
  }

  res.json({
    emails,
    pagination: {
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

/**
 * Get email content for a specific tracked email
 */
router.get('/content/:trackingId', asyncHandler(async (req, res) => {
  const { trackingId } = req.params;

  // First verify the email tracking belongs to the user
  const { data: tracking, error: trackingError } = await supabaseAdmin
    .from('email_tracking')
    .select('id')
    .eq('id', trackingId)
    .eq('user_id', req.userId)
    .single();

  if (trackingError || !tracking) {
    return res.status(404).json({
      error: 'Email tracking not found',
      code: 'EMAIL_TRACKING_NOT_FOUND'
    });
  }

  // Get the email content
  const { data: content, error } = await supabaseAdmin
    .from('email_content')
    .select('*')
    .eq('email_tracking_id', trackingId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        error: 'Email content not found',
        code: 'EMAIL_CONTENT_NOT_FOUND'
      });
    }
    console.error('Error fetching email content:', error);
    return res.status(500).json({
      error: 'Failed to fetch email content',
      code: 'FETCH_EMAIL_CONTENT_ERROR'
    });
  }

  res.json({ content });
}));

/**
 * Trigger email sync for the authenticated user
 */
router.post('/sync', asyncHandler(async (req, res) => {
  const { access_token, options = {} } = req.body;

  console.log(`🚀 EMAIL SYNC REQUEST RECEIVED`);
  console.log(`   User ID: ${req.userId}`);
  console.log(`   Access token provided: ${!!access_token}`);
  console.log(`   Options:`, options);

  if (!access_token) {
    console.log(`❌ No access token provided`);
    return res.status(400).json({
      error: 'Gmail access token is required',
      code: 'MISSING_ACCESS_TOKEN'
    });
  }

  try {
    console.log(`📧 Starting simple email sync for user ${req.userId}...`);
    
    // Step 1: Sync emails from Gmail
    const syncResult = await gmailService.syncUserEmails(req.userId, access_token, options);
    
    console.log(`✅ EMAIL SYNC COMPLETED:`);
    console.log(`   Total found: ${syncResult.totalFound}`);
    console.log(`   New emails processed: ${syncResult.processedCount}`);
    console.log(`   New emails for analysis: ${syncResult.newEmails?.length || 0}`);
    
    // Step 2: If we have new emails, analyze them one by one
    if (syncResult.newEmails && syncResult.newEmails.length > 0) {
      console.log(`🤖 Starting LLM analysis of ${syncResult.newEmails.length} emails...`);
      
      const trackingIds = syncResult.newEmails.map(e => e.id);
      console.log(`   Analyzing tracking IDs: ${trackingIds.join(', ')}`);
      
      // Analyze emails sequentially (one by one)
      const analysisResults = await llmService.analyzeEmailBatch(trackingIds, req.userId);
      
      console.log(`✅ LLM ANALYSIS COMPLETED:`);
      console.log(`   Results:`, analysisResults);
      
      res.json({
        message: 'Email sync and analysis completed',
        ...syncResult,
        analysisResults
      });
    } else {
      res.json({
        message: 'Email sync completed - no new emails to analyze',
        ...syncResult
      });
    }

  } catch (error) {
    console.error('❌ EMAIL SYNC ERROR:', error);
    res.status(500).json({
      error: 'Failed to sync emails',
      code: 'EMAIL_SYNC_ERROR',
      details: error.message
    });
  }
}));

/**
 * Process specific emails through LLM analysis
 */
router.post('/process', asyncHandler(async (req, res) => {
  const { email_ids } = req.body;

  if (!Array.isArray(email_ids) || email_ids.length === 0) {
    return res.status(400).json({
      error: 'Email IDs array is required',
      code: 'MISSING_EMAIL_IDS'
    });
  }

  if (email_ids.length > 10) {
    return res.status(400).json({
      error: 'Maximum 10 emails can be processed at once',
      code: 'TOO_MANY_EMAILS'
    });
  }

  try {
    // Process emails through LLM
    const results = await llmService.analyzeEmailBatch(email_ids, req.userId);

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;

    res.json({
      message: 'Email processing completed',
      total_processed: results.length,
      successful: successCount,
      failed: errorCount,
      results
    });

  } catch (error) {
    console.error('Email processing error:', error);
    res.status(500).json({
      error: 'Failed to process emails',
      code: 'EMAIL_PROCESSING_ERROR',
      details: error.message
    });
  }
}));

/**
 * Get processing statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    // Get basic email tracking stats
    const { data: stats, error } = await supabaseAdmin
      .from('email_tracking')
      .select('is_processed, is_job_related, confidence_score')
      .eq('user_id', req.userId);

    if (error) {
      throw error;
    }

    // Get LLM analysis stats
    const llmStats = await llmService.getAnalysisStats(req.userId);

    const statistics = {
      total: stats.length,
      processed: stats.filter(s => s.is_processed).length,
      unprocessed: stats.filter(s => !s.is_processed).length,
      job_related: stats.filter(s => s.is_job_related === true).length,
      not_job_related: stats.filter(s => s.is_job_related === false).length,
      pending_analysis: stats.filter(s => s.is_job_related === null).length,
      llm_analysis: llmStats
    };

    res.json({ statistics });

  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({
      error: 'Failed to fetch email statistics',
      code: 'FETCH_EMAIL_STATS_ERROR'
    });
  }
}));

module.exports = router;