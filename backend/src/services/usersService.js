const { supabaseAdmin } = require('../config/supabase');

class UsersService {
  /**
   * Create or update user in users table when they log in
   */
  async ensureUserExists(userId, userEmail, userName) {
    try {
      console.log(`👤 Ensuring user exists in users table:`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Email: ${userEmail}`);
      console.log(`   Name: ${userName}`);

      // Check if user already exists
      const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error checking for existing user:', fetchError);
        throw new Error(`Failed to check for existing user: ${fetchError.message}`);
      }

      if (existingUser) {
        console.log(`✅ User already exists in users table`);
        console.log(`   Email sync enabled: ${existingUser.email_sync_enabled}`);
        console.log(`   Last sync enabled: ${existingUser.last_sync_enabled_at || 'never'}`);
        
        // Update user info in case it changed
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            email: userEmail,
            name: userName,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('❌ Error updating user info:', updateError);
        } else {
          console.log(`✅ Updated user info successfully`);
        }

        return existingUser;
      }

      // Create new user
      console.log(`📝 Creating new user in users table...`);
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: userEmail,
          name: userName,
          email_sync_enabled: false, // Default to disabled
          last_sync_enabled_at: null
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating user:', createError);
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      console.log(`✅ Created new user successfully:`);
      console.log(`   User ID: ${newUser.id}`);
      console.log(`   Email sync enabled: ${newUser.email_sync_enabled}`);
      
      return newUser;

    } catch (error) {
      console.error('❌ Error in ensureUserExists:', error);
      throw error;
    }
  }

  /**
   * Get user profile with sync preferences
   */
  async getUserProfile(userId) {
    try {
      console.log(`📋 Fetching user profile for: ${userId}`);

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching user profile:', error);
        throw new Error(`Failed to fetch user profile: ${error.message}`);
      }

      console.log(`✅ User profile fetched:`, {
        email: user.email,
        name: user.name,
        email_sync_enabled: user.email_sync_enabled,
        last_sync_enabled_at: user.last_sync_enabled_at
      });

      return user;

    } catch (error) {
      console.error('❌ Error in getUserProfile:', error);
      throw error;
    }
  }

  /**
   * Update email sync preference
   */
  async updateEmailSyncPreference(userId, enabled) {
    try {
      console.log(`🔄 Updating email sync preference for user ${userId}:`);
      console.log(`   New setting: ${enabled ? 'ENABLED' : 'DISABLED'}`);

      const updateData = {
        email_sync_enabled: enabled,
        updated_at: new Date().toISOString()
      };

      // If enabling sync, record the timestamp
      if (enabled) {
        updateData.last_sync_enabled_at = new Date().toISOString();
        console.log(`   Setting last_sync_enabled_at: ${updateData.last_sync_enabled_at}`);
      }

      const { data: updatedUser, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating email sync preference:', error);
        throw new Error(`Failed to update email sync preference: ${error.message}`);
      }

      console.log(`✅ Email sync preference updated successfully:`);
      console.log(`   Email sync enabled: ${updatedUser.email_sync_enabled}`);
      console.log(`   Last sync enabled at: ${updatedUser.last_sync_enabled_at || 'never'}`);

      return updatedUser;

    } catch (error) {
      console.error('❌ Error in updateEmailSyncPreference:', error);
      throw error;
    }
  }

  /**
   * Get users with email sync enabled (for background processing)
   */
  async getUsersWithSyncEnabled() {
    try {
      console.log(`🔍 Fetching users with email sync enabled...`);

      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, last_sync_enabled_at')
        .eq('email_sync_enabled', true);

      if (error) {
        console.error('❌ Error fetching sync-enabled users:', error);
        throw new Error(`Failed to fetch sync-enabled users: ${error.message}`);
      }

      console.log(`✅ Found ${users.length} users with email sync enabled`);
      
      return users;

    } catch (error) {
      console.error('❌ Error in getUsersWithSyncEnabled:', error);
      throw error;
    }
  }

  /**
   * Update user's last sync timestamp when sync completes
   */
  async updateLastSyncTimestamp(userId) {
    try {
      const now = new Date().toISOString();
      console.log(`📅 Updating last sync timestamp for user: ${userId} to: ${now}`);

      const { error } = await supabaseAdmin
        .from('users')
        .update({
          last_sync_timestamp: now,
          updated_at: now
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Error updating last sync timestamp:', error);
        throw new Error(`Failed to update last sync timestamp: ${error.message}`);
      }

      console.log(`✅ Last sync timestamp updated successfully`);
      return now;

    } catch (error) {
      console.error('❌ Error in updateLastSyncTimestamp:', error);
      throw error;
    }
  }
}

module.exports = new UsersService();