const { supabaseAdmin, corsHandler, authenticateToken, handleError } = require('../_config');

module.exports = async (req, res) => {
  corsHandler(req, res);
  
  if (req.method === 'OPTIONS') return;

  // Authentication required
  const auth = await authenticateToken(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { userId } = auth;

  try {
    if (req.method === 'GET') {
      console.log(`📋 GET /api/users/profile - User: ${userId}`);
      console.log(`📋 Fetching user profile for: ${userId}`);

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user profile'
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      console.log('✅ User profile fetched:', {
        email: user.email,
        name: user.name,
        email_sync_enabled: user.email_sync_enabled,
        last_sync_enabled_at: user.last_sync_enabled_at
      });

      res.json({
        success: true,
        user
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    handleError(res, error);
  }
};