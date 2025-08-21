// Shared configuration for all Vercel Functions
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// CORS configuration - Production only
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'https://pipeline-cyan.vercel.app',
    'https://pipeline-cyan.vercel.app',
    'https://*.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Helper function to handle CORS
function corsHandler(req, res, next) {
  const origin = req.headers.origin;
  if (corsOptions.origin.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (next) next();
}

// Authentication middleware
async function authenticateToken(req, res) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return { error: 'Access token required', status: 401 };
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return { error: 'Invalid or expired token.', status: 401 };
    }

    return { user, userId: user.id };
  } catch (error) {
    console.error('Auth error:', error);
    return { error: 'Authentication failed', status: 500 };
  }
}

// Error handler
function handleError(res, error, defaultMessage = 'Internal server error') {
  console.error('API Error:', error);
  const status = error.status || 500;
  const message = error.message || defaultMessage;
  res.status(status).json({ error: message });
}

module.exports = {
  supabaseAdmin,
  corsHandler,
  authenticateToken,
  handleError
};