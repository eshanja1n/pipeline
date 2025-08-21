const { supabaseAdmin, corsHandler, authenticateToken, handleError } = require('../_config');

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
  const { email, name } = req.body;

  try {
    console.log(`👤 POST /api/users/ensure-exists - User: ${userId}`);
    console.log(`   Request body:`, { email, name });

    console.log(`👤 Ensuring user exists in users table:`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);

    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking user existence:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check user existence'
      });
    }

    if (existingUser) {
      console.log('✅ User already exists in users table');
      console.log(`   Email sync enabled: ${existingUser.email_sync_enabled}`);
      console.log(`   Last sync enabled: ${existingUser.last_sync_enabled_at}`);

      // Update user info if needed
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          email: email,
          name: name,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user info:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update user info'
        });
      }

      console.log('✅ Updated user info successfully');
      console.log('✅ User ensured in database successfully');

      return res.json({
        success: true,
        user: updatedUser,
        created: false
      });
    }

    // Create new user
    console.log('👤 Creating new user in users table...');
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: userId,
        email: email,
        name: name,
        email_sync_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user'
      });
    }

    console.log('✅ New user created successfully');
    console.log('✅ User ensured in database successfully');

    res.json({
      success: true,
      user: newUser,
      created: true
    });
  } catch (error) {
    handleError(res, error);
  }
};