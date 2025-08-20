const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandlers');
const { validateJob, validateJobUpdate } = require('../utils/validation');

const router = express.Router();

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

// All job routes require authentication
router.use(authenticateToken);

/**
 * Get all jobs for the authenticated user
 */
router.get('/', asyncHandler(async (req, res) => {
  const { status, limit = 100, offset = 0 } = req.query;
  
  let query = supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('user_id', req.userId)
    .order('applied_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: jobs, error, count } = await query;

  if (error) {
    console.error('Error fetching jobs:', error);
    return res.status(500).json({
      error: 'Failed to fetch jobs',
      code: 'FETCH_JOBS_ERROR'
    });
  }

  res.json({
    jobs: jobs.map(mapJobToFrontend),
    pagination: {
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

/**
 * Get a specific job by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: job, error } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        error: 'Job not found',
        code: 'JOB_NOT_FOUND'
      });
    }
    console.error('Error fetching job:', error);
    return res.status(500).json({
      error: 'Failed to fetch job',
      code: 'FETCH_JOB_ERROR'
    });
  }

  res.json({ job: mapJobToFrontend(job) });
}));

/**
 * Create a new job
 */
router.post('/', asyncHandler(async (req, res) => {
  const validation = validateJob(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: validation.errors
    });
  }

  const jobData = {
    ...mapJobToDatabase(validation.data),
    user_id: req.userId
  };

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

  res.status(201).json({ job });
}));

/**
 * Update a job
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const validation = validateJobUpdate(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: validation.errors
    });
  }

  const { data: job, error } = await supabaseAdmin
    .from('jobs')
    .update(mapJobToDatabase(validation.data))
    .eq('id', id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        error: 'Job not found',
        code: 'JOB_NOT_FOUND'
      });
    }
    console.error('Error updating job:', error);
    return res.status(500).json({
      error: 'Failed to update job',
      code: 'UPDATE_JOB_ERROR'
    });
  }

  res.json({ job: mapJobToFrontend(job) });
}));

/**
 * Delete a job
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('jobs')
    .delete()
    .eq('id', id)
    .eq('user_id', req.userId);

  if (error) {
    console.error('Error deleting job:', error);
    return res.status(500).json({
      error: 'Failed to delete job',
      code: 'DELETE_JOB_ERROR'
    });
  }

  res.status(204).send();
}));

/**
 * Bulk update job statuses
 */
router.patch('/bulk-update', asyncHandler(async (req, res) => {
  const { updates } = req.body; // Array of { id, status }

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({
      error: 'Updates array is required',
      code: 'MISSING_UPDATES'
    });
  }

  const validStatuses = ['applied', 'interview', 'offer', 'rejected'];
  const invalidUpdates = updates.filter(update => 
    !update.id || !validStatuses.includes(update.status)
  );

  if (invalidUpdates.length > 0) {
    return res.status(400).json({
      error: 'Invalid update format',
      code: 'INVALID_UPDATES',
      details: invalidUpdates
    });
  }

  // Process updates one by one (could be optimized with a single query)
  const results = [];
  for (const update of updates) {
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .update({ status: update.status })
      .eq('id', update.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    results.push({
      id: update.id,
      success: !error,
      job: data ? mapJobToFrontend(data) : null,
      error: error?.message
    });
  }

  res.json({ results });
}));

module.exports = router;