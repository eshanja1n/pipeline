const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createTables() {
  console.log('🚀 Creating database tables with service role key...\n');

  try {
    // Test connection first
    const { data: testData, error: testError } = await supabaseAdmin
      .from('_supabase_migrations')
      .select('*')
      .limit(1);
      
    if (testError && !testError.message.includes('does not exist')) {
      console.error('❌ Connection test failed:', testError);
      return;
    }
    
    console.log('✅ Connection successful');

    // Create the jobs table directly using SQL
    const createTableSQL = `
      -- Create jobs table
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        company TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('applied', 'interview', 'offer', 'rejected')),
        applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
        description TEXT,
        salary_range TEXT,
        location TEXT,
        job_url TEXT,
        source TEXT DEFAULT 'manual',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_applied_date ON jobs(applied_date);

      -- Create update function
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Create trigger
      DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
      CREATE TRIGGER update_jobs_updated_at
        BEFORE UPDATE ON jobs
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- Enable RLS
      ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies
      DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
      DROP POLICY IF EXISTS "Users can insert their own jobs" ON jobs;
      DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
      DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;

      CREATE POLICY "Users can view their own jobs" ON jobs
        FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "Users can insert their own jobs" ON jobs
        FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Users can update their own jobs" ON jobs
        FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY "Users can delete their own jobs" ON jobs
        FOR DELETE USING (auth.uid() = user_id);
    `;

    console.log('Creating tables...');
    
    // Execute SQL using the rpc function
    const { data, error } = await supabaseAdmin.rpc('exec', {
      sql: createTableSQL
    });

    if (error) {
      console.error('❌ SQL execution failed:', error);
      console.log('\n📋 Manual setup required. Run this SQL in Supabase dashboard:');
      console.log(createTableSQL);
      return;
    }

    console.log('✅ Tables created successfully!');

    // Test the table by trying to query it
    const { data: testJobs, error: queryError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .limit(1);

    if (queryError) {
      console.log('❌ Table query test failed:', queryError.message);
    } else {
      console.log('✅ Jobs table is accessible and ready to use!');
    }

    console.log('\n🎉 Database setup completed successfully!');

  } catch (err) {
    console.error('❌ Setup failed:', err);
    
    console.log('\n📋 If automatic setup failed, create tables manually:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Run the SQL commands above');
  }
}

if (require.main === module) {
  createTables()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { createTables };