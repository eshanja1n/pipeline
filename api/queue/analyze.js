const { supabaseAdmin, corsHandler, authenticateToken, handleError } = require('../_config');

// Import the LLM service from backend
const path = require('path');
const LLMService = require(path.join(__dirname, '../../backend/src/services/llmService.js'));

module.exports = async (req, res) => {
  corsHandler(req, res);
  
  if (req.method === 'OPTIONS') return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication required
  const auth = await authenticateToken(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { userId } = auth;
  const { email_ids } = req.body;

  try {
    console.log('🔍 EMAIL ANALYSIS REQUEST RECEIVED');
    console.log(`   User ID: ${userId}`);
    console.log(`   Email IDs: ${email_ids}`);

    if (!email_ids || !Array.isArray(email_ids) || email_ids.length === 0) {
      return res.status(400).json({
        error: 'email_ids array is required',
        code: 'MISSING_EMAIL_IDS'
      });
    }

    console.log(`🚀 Starting batch analysis for ${email_ids.length} emails...`);

    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return res.status(400).json({
        error: 'AWS credentials not configured. Please configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.',
        code: 'MISSING_AWS_CREDENTIALS'
      });
    }

    // Use the LLM service to analyze emails
    const results = await LLMService.analyzeEmailBatch(email_ids, userId);

    console.log('✅ Email analysis completed successfully');
    res.json({
      success: true,
      results,
      totalProcessed: results.length,
      successCount: results.filter(r => r.success).length,
      errorCount: results.filter(r => !r.success).length
    });

  } catch (error) {
    console.error('❌ Email analysis failed:', error);
    handleError(res, error, 'Email analysis failed');
  }
};