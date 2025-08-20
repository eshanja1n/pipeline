const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY // We'll need the service role key
);

async function createTablesDirectly() {
  console.log('🚀 Creating database tables programmatically...\n');

  const queries = [
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
      name: 'Create indexes',
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
      name: 'Create trigger',
      sql: `
        DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
        CREATE TRIGGER update_jobs_updated_at
          BEFORE UPDATE ON jobs
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `
    },
    {
      name: 'Enable RLS',
      sql: `ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;`
    },
    {
      name: 'Create RLS policies',
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

  // Try using fetch directly to Supabase's REST API
  for (const query of queries) {
    try {
      console.log(`Running: ${query.name}...`);
      
      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ 
          sql: query.sql.trim()
        })
      });

      if (response.ok) {
        console.log(`✅ ${query.name} completed`);
      } else {
        const errorText = await response.text();
        console.log(`❌ ${query.name} failed:`, errorText);
        
        // Try alternative approach using direct SQL execution
        console.log('Trying alternative approach...');
        await executeWithAlternativeMethod(query);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (err) {
      console.error(`❌ Exception in ${query.name}:`, err.message);
    }
  }

  console.log('\n🎉 Database setup completed!');
  console.log('Testing table creation...');
  
  // Test if table was created by trying to query it
  try {
    const { data, error } = await supabaseAdmin.from('jobs').select('*').limit(1);
    if (error) {
      console.log('❌ Table test failed:', error.message);
      console.log('\n📋 If tables were not created, you can run the SQL manually:');
      console.log(getAllSQL());
    } else {
      console.log('✅ Jobs table is accessible!');
    }
  } catch (err) {
    console.log('❌ Table test error:', err.message);
  }
}

async function executeWithAlternativeMethod(query) {
  // Try using node-postgres directly if available
  try {
    const { Pool } = require('pg');
    
    // Extract connection details from Supabase URL
    const url = new URL(process.env.REACT_APP_SUPABASE_URL);
    const pool = new Pool({
      host: url.hostname,
      port: url.port || 5432,
      database: url.pathname.slice(1),
      user: 'postgres',
      password: process.env.SUPABASE_DB_PASSWORD || '', // You'd need to add this
      ssl: { rejectUnauthorized: false }
    });

    const result = await pool.query(query.sql);
    console.log(`✅ ${query.name} completed with direct connection`);
    await pool.end();
    
  } catch (err) {
    console.log(`❌ Alternative method failed for ${query.name}:`, err.message);
  }
}

function getAllSQL() {
  return `-- Complete table setup SQL
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

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_applied_date ON jobs(applied_date);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

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
  FOR DELETE USING (auth.uid() = user_id);`;
}

if (require.main === module) {
  createTablesDirectly()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Setup failed:', err);
      process.exit(1);
    });
}

module.exports = { createTablesDirectly };