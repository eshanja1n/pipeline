const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function runMigration(filePath, description) {
  try {
    console.log(`Running: ${description}...`);
    const sql = await fs.readFile(filePath, 'utf8');
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Error in ${description}:`, error);
      return false;
    } else {
      console.log(`✅ ${description} completed successfully`);
      return true;
    }
  } catch (err) {
    console.error(`❌ Failed to read ${filePath}:`, err);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database tables...\n');

  const migrations = [
    {
      file: path.join(__dirname, '../database/001_create_jobs_table.sql'),
      description: 'Create jobs table'
    },
    {
      file: path.join(__dirname, '../database/002_create_email_tracking_table.sql'),
      description: 'Create email tracking table'
    },
    {
      file: path.join(__dirname, '../database/003_create_email_content_table.sql'),
      description: 'Create email content table'
    },
    {
      file: path.join(__dirname, '../database/004_create_rls_policies.sql'),
      description: 'Set up Row Level Security policies'
    }
  ];

  let allSuccessful = true;

  for (const migration of migrations) {
    const success = await runMigration(migration.file, migration.description);
    if (!success) {
      allSuccessful = false;
      break;
    }
    // Small delay between migrations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (allSuccessful) {
    console.log('\n🎉 Database setup completed successfully!');
    console.log('You can now use your app with the database tables.');
  } else {
    console.log('\n❌ Database setup failed. Please check the errors above.');
    console.log('You may need to run the SQL commands manually in Supabase dashboard.');
  }
}

// Alternative approach using individual SQL commands
async function setupDatabaseDirect() {
  console.log('🚀 Setting up database with direct SQL execution...\n');

  const sqlCommands = [
    {
      name: 'Create jobs table',
      sql: `
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
      `
    },
    {
      name: 'Create jobs indexes',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_applied_date ON jobs(applied_date);
      `
    },
    {
      name: 'Create update function',
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `
    },
    {
      name: 'Create jobs trigger',
      sql: `
        DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
        CREATE TRIGGER update_jobs_updated_at
          BEFORE UPDATE ON jobs
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `
    },
    {
      name: 'Enable RLS on jobs',
      sql: `
        ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
      `
    },
    {
      name: 'Create jobs RLS policies',
      sql: `
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
      `
    }
  ];

  for (const command of sqlCommands) {
    try {
      console.log(`Running: ${command.name}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: command.sql });
      
      if (error) {
        console.error(`❌ Error in ${command.name}:`, error);
        console.log('Trying alternative method...');
        
        // Alternative: Use the REST API directly
        const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
            'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ sql_query: command.sql })
        });
        
        if (!response.ok) {
          console.error(`❌ Alternative method also failed for ${command.name}`);
          continue;
        }
      }
      
      console.log(`✅ ${command.name} completed`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (err) {
      console.error(`❌ Exception in ${command.name}:`, err);
    }
  }

  console.log('\n🎉 Database setup attempt completed!');
  console.log('Please check your Supabase dashboard to verify tables were created.');
}

// Run the setup
if (require.main === module) {
  setupDatabaseDirect()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Setup failed:', err);
      process.exit(1);
    });
}

module.exports = { setupDatabase, setupDatabaseDirect };