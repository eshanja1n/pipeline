const https = require('https');
const http = require('http');
const { URL } = require('url');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const req = client.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          body: body,
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function createTablesWithHTTP() {
  console.log('🚀 Creating database tables using direct HTTP requests...\n');

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase URL or service key');
    return;
  }

  const createTableSQL = `
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
  FOR DELETE USING (auth.uid() = user_id);
  `.trim();

  try {
    console.log('Attempting to create tables...');

    // Try to execute SQL using the query endpoint
    const queryUrl = `${supabaseUrl}/rest/v1/query`;
    const response = await makeRequest(queryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Prefer': 'return=minimal'
      }
    }, JSON.stringify({ query: createTableSQL }));

    if (response.ok) {
      console.log('✅ Tables created successfully!');
    } else {
      console.log('❌ Query endpoint failed, trying alternative...');
      console.log('Response:', response.body);

      // Try a simple table creation using the REST API
      await createTableWithRestAPI();
    }

  } catch (err) {
    console.error('❌ HTTP request failed:', err.message);
    await createTableWithRestAPI();
  }
}

async function createTableWithRestAPI() {
  console.log('📝 Creating tables manually...');
  
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseAdmin = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );

  try {
    // Try to create a test job to see if table exists
    const { data: testData, error: testError } = await supabaseAdmin
      .from('jobs')
      .insert([{
        user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
        company: 'Test Company',
        role: 'Test Role',
        status: 'applied'
      }])
      .select();

    if (testError) {
      if (testError.message.includes('does not exist')) {
        console.log('❌ Jobs table does not exist');
        printManualInstructions();
      } else {
        console.log('❌ Table test failed:', testError.message);
        printManualInstructions();
      }
    } else {
      console.log('✅ Jobs table already exists and is working!');
      
      // Clean up test data
      if (testData && testData[0]) {
        await supabaseAdmin.from('jobs').delete().eq('id', testData[0].id);
        console.log('🧹 Test data cleaned up');
      }
    }

  } catch (err) {
    console.error('❌ REST API test failed:', err.message);
    printManualInstructions();
  }
}

function printManualInstructions() {
  console.log('\n📋 Please create the table manually in Supabase:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to SQL Editor');
  console.log('4. Copy and paste this SQL:\n');
  
  console.log(`CREATE TABLE IF NOT EXISTS jobs (
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
  FOR DELETE USING (auth.uid() = user_id);`);

  console.log('\n5. Click "Run" to execute the SQL');
  console.log('6. After running, your job board app will work correctly!');
}

if (require.main === module) {
  createTablesWithHTTP()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { createTablesWithHTTP };