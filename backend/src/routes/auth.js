const express = require('express');
const { supabaseClient } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { createRateLimitMiddleware } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandlers');

const router = express.Router();

// Apply auth-specific rate limiting
router.use(createRateLimitMiddleware('auth'));

/**
 * Verify token endpoint
 */
router.get('/verify', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      user_metadata: req.user.user_metadata,
      created_at: req.user.created_at
    }
  });
}));

/**
 * Refresh token endpoint
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      error: 'Refresh token is required',
      code: 'MISSING_REFRESH_TOKEN'
    });
  }

  const { data, error } = await supabaseClient.auth.refreshSession({
    refresh_token
  });

  if (error) {
    return res.status(401).json({
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: data.user
  });
}));

/**
 * Sign out endpoint
 */
router.post('/signout', authenticateToken, asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    // Sign out the specific session
    await supabaseClient.auth.signOut(token);
  }

  res.json({ message: 'Signed out successfully' });
}));

/**
 * Get user profile
 */
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      user_metadata: req.user.user_metadata,
      created_at: req.user.created_at,
      updated_at: req.user.updated_at
    }
  });
}));

module.exports = router;