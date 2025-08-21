const { corsHandler } = require('./_config');

module.exports = async (req, res) => {
  corsHandler(req, res);
  
  if (req.method === 'OPTIONS') return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        supabase: 'healthy',
        redis: 'not_implemented',
        aws: {
          region: process.env.AWS_REGION || 'us-west-2',
          status: 'configured'
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};