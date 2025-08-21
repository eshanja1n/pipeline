const { supabaseAdmin, corsHandler, authenticateToken, handleError } = require('./_config');

// Helper function to map database job to frontend format
function mapJobToFrontend(dbJob) {
  return {
    id: dbJob.id,
    title: dbJob.role, // Map role to title
    company: dbJob.company,
    appliedDate: dbJob.applied_date, // Map applied_date to appliedDate
    status: dbJob.status
  };
}

// Helper function to map frontend job data to database format
function mapJobToDatabase(frontendJob) {
  return {
    role: frontendJob.title, // Map title to role
    company: frontendJob.company,
    applied_date: frontendJob.appliedDate,
    status: frontendJob.status
  };
}

module.exports = async (req, res) => {
  corsHandler(req, res);
  
  if (req.method === 'OPTIONS') return;

  // Authentication required for all job endpoints
  const auth = await authenticateToken(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { userId } = auth;

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetJobs(req, res, userId);
      case 'POST':
        return await handleCreateJob(req, res, userId);
      case 'PUT':
        return await handleUpdateJob(req, res, userId);
      case 'DELETE':
        return await handleDeleteJob(req, res, userId);
      case 'PATCH':
        return await handleBulkUpdate(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    handleError(res, error);
  }
};

async function handleGetJobs(req, res, userId) {
  const { status, limit = 100, offset = 0 } = req.query;
  
  console.log(`🔍 Jobs API: GET /jobs - userId: ${userId}, status: ${status}, limit: ${limit}, offset: ${offset}`);
  
  let query = supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .order('applied_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: jobs, error, count } = await query;

  console.log(`✅ Jobs API: Query result - jobs: ${jobs?.length || 0}, error: ${!!error}, count: ${count}`);

  if (error) {
    console.error('❌ Jobs API: Error fetching jobs:', error);
    return res.status(500).json({
      error: 'Failed to fetch jobs',
      code: 'FETCH_JOBS_ERROR'
    });
  }

  const response = {
    jobs: jobs.map(mapJobToFrontend),
    pagination: {
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  };

  console.log(`📤 Jobs API: Sending response - ${response.jobs.length} jobs`);
  res.json(response);
}

async function handleCreateJob(req, res, userId) {
  const jobData = mapJobToDatabase(req.body);
  jobData.user_id = userId;

  const { data: job, error } = await supabaseAdmin
    .from('jobs')
    .insert([jobData])
    .select()
    .single();

  if (error) {
    console.error('Error creating job:', error);
    return res.status(500).json({
      error: 'Failed to create job',
      code: 'CREATE_JOB_ERROR'
    });
  }

  res.status(201).json({
    job: mapJobToFrontend(job)
  });
}

async function handleUpdateJob(req, res, userId) {
  const { id } = req.query;
  const jobData = mapJobToDatabase(req.body);

  const { data: job, error } = await supabaseAdmin
    .from('jobs')
    .update(jobData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating job:', error);
    return res.status(500).json({
      error: 'Failed to update job',
      code: 'UPDATE_JOB_ERROR'
    });
  }

  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      code: 'JOB_NOT_FOUND'
    });
  }

  res.json({
    job: mapJobToFrontend(job)
  });
}

async function handleDeleteJob(req, res, userId) {
  const { id } = req.query;

  const { error } = await supabaseAdmin
    .from('jobs')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting job:', error);
    return res.status(500).json({
      error: 'Failed to delete job',
      code: 'DELETE_JOB_ERROR'
    });
  }

  res.status(204).end();
}

async function handleBulkUpdate(req, res, userId) {
  const { updates } = req.body;

  if (!Array.isArray(updates)) {
    return res.status(400).json({
      error: 'Updates must be an array',
      code: 'INVALID_UPDATES_FORMAT'
    });
  }

  const results = [];

  for (const update of updates) {
    try {
      const { data: job, error } = await supabaseAdmin
        .from('jobs')
        .update({ status: update.status })
        .eq('id', update.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        results.push({
          id: update.id,
          success: false,
          error: error.message
        });
      } else {
        results.push({
          id: update.id,
          success: true,
          job: mapJobToFrontend(job)
        });
      }
    } catch (error) {
      results.push({
        id: update.id,
        success: false,
        error: error.message
      });
    }
  }

  res.json({ results });
}