const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandlers');
const usersService = require('../services/usersService');

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

/**
 * Get user profile with sync preferences
 */
router.get('/profile', asyncHandler(async (req, res) => {
  console.log(`📋 GET /api/users/profile - User: ${req.userId}`);

  try {
    const userProfile = await usersService.getUserProfile(req.userId);
    
    res.json({
      success: true,
      user: userProfile
    });

  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    res.status(500).json({
      error: 'Failed to fetch user profile',
      code: 'FETCH_USER_PROFILE_ERROR',
      details: error.message
    });
  }
}));

/**
 * Update email sync preference
 */
router.put('/email-sync-preference', asyncHandler(async (req, res) => {
  const { enabled } = req.body;

  console.log(`🔄 PUT /api/users/email-sync-preference - User: ${req.userId}`);
  console.log(`   Request body:`, { enabled });

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({
      error: 'enabled field must be a boolean',
      code: 'INVALID_ENABLED_VALUE'
    });
  }

  try {
    const updatedUser = await usersService.updateEmailSyncPreference(req.userId, enabled);
    
    console.log(`✅ Email sync preference updated successfully`);
    
    res.json({
      success: true,
      message: `Email sync ${enabled ? 'enabled' : 'disabled'} successfully`,
      user: {
        email_sync_enabled: updatedUser.email_sync_enabled,
        last_sync_enabled_at: updatedUser.last_sync_enabled_at
      }
    });

  } catch (error) {
    console.error('❌ Error updating email sync preference:', error);
    res.status(500).json({
      error: 'Failed to update email sync preference',
      code: 'UPDATE_EMAIL_SYNC_PREFERENCE_ERROR',
      details: error.message
    });
  }
}));

/**
 * Ensure user exists in database (called on login)
 */
router.post('/ensure-exists', asyncHandler(async (req, res) => {
  const { email, name } = req.body;

  console.log(`👤 POST /api/users/ensure-exists - User: ${req.userId}`);
  console.log(`   Request body:`, { email, name });

  if (!email || !name) {
    return res.status(400).json({
      error: 'email and name are required',
      code: 'MISSING_USER_INFO'
    });
  }

  try {
    const user = await usersService.ensureUserExists(req.userId, email, name);
    
    console.log(`✅ User ensured in database successfully`);
    
    res.json({
      success: true,
      message: 'User ensured in database',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        email_sync_enabled: user.email_sync_enabled,
        last_sync_enabled_at: user.last_sync_enabled_at
      }
    });

  } catch (error) {
    console.error('❌ Error ensuring user exists:', error);
    res.status(500).json({
      error: 'Failed to ensure user exists',
      code: 'ENSURE_USER_EXISTS_ERROR',
      details: error.message
    });
  }
}));

module.exports = router;