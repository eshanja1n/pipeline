const { supabaseAdmin, corsHandler, authenticateToken, handleError } = require('../_config');

module.exports = async (req, res) => {
  corsHandler(req, res);
  
  if (req.method === 'OPTIONS') return;

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication required
  const auth = await authenticateToken(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { userId } = auth;
  const { enabled } = req.body;

  try {
    console.log(`🔧 PUT /api/users/email-sync-preference - User: ${userId}`);
    console.log(`   Setting email sync to: ${enabled}`);

    const updateData = {
      email_sync_enabled: enabled,
      updated_at: new Date().toISOString()
    };

    // If enabling sync, record when it was enabled
    if (enabled) {
      updateData.last_sync_enabled_at = new Date().toISOString();
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating email sync preference:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update email sync preference'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log(`✅ Email sync preference updated: ${enabled}`);

    res.json({
      success: true,
      user
    });
  } catch (error) {
    handleError(res, error);
  }
};