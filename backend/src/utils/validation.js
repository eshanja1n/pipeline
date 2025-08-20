const validator = require('validator');

/**
 * Validate job creation data
 */
function validateJob(data) {
  const errors = [];
  const cleanData = {};

  // Required fields
  if (!data.company || typeof data.company !== 'string' || data.company.trim().length === 0) {
    errors.push('Company name is required');
  } else {
    cleanData.company = data.company.trim();
  }

  if (!data.role || typeof data.role !== 'string' || data.role.trim().length === 0) {
    errors.push('Role is required');
  } else {
    cleanData.role = data.role.trim();
  }

  const validStatuses = ['applied', 'interview', 'offer', 'rejected'];
  if (!data.status || !validStatuses.includes(data.status)) {
    errors.push('Status must be one of: applied, interview, offer, rejected');
  } else {
    cleanData.status = data.status;
  }

  // Optional fields with validation
  if (data.applied_date) {
    if (!validator.isDate(data.applied_date)) {
      errors.push('Applied date must be a valid date');
    } else {
      cleanData.applied_date = data.applied_date;
    }
  } else {
    cleanData.applied_date = new Date().toISOString().split('T')[0]; // Default to today
  }

  if (data.description && typeof data.description === 'string') {
    cleanData.description = data.description.trim();
  }

  if (data.salary_range && typeof data.salary_range === 'string') {
    cleanData.salary_range = data.salary_range.trim();
  }

  if (data.location && typeof data.location === 'string') {
    cleanData.location = data.location.trim();
  }

  if (data.job_url && typeof data.job_url === 'string') {
    if (!validator.isURL(data.job_url, { require_protocol: true })) {
      errors.push('Job URL must be a valid URL');
    } else {
      cleanData.job_url = data.job_url.trim();
    }
  }

  if (data.source && typeof data.source === 'string') {
    const validSources = ['manual', 'email', 'imported'];
    if (!validSources.includes(data.source)) {
      errors.push('Source must be one of: manual, email, imported');
    } else {
      cleanData.source = data.source;
    }
  }

  return {
    isValid: errors.length === 0,
    data: cleanData,
    errors
  };
}

/**
 * Validate job update data (all fields optional)
 */
function validateJobUpdate(data) {
  const errors = [];
  const cleanData = {};

  // All fields are optional for updates, but validate if provided
  if (data.company !== undefined) {
    if (!data.company || typeof data.company !== 'string' || data.company.trim().length === 0) {
      errors.push('Company name cannot be empty');
    } else {
      cleanData.company = data.company.trim();
    }
  }

  if (data.role !== undefined) {
    if (!data.role || typeof data.role !== 'string' || data.role.trim().length === 0) {
      errors.push('Role cannot be empty');
    } else {
      cleanData.role = data.role.trim();
    }
  }

  if (data.status !== undefined) {
    const validStatuses = ['applied', 'interview', 'offer', 'rejected'];
    if (!validStatuses.includes(data.status)) {
      errors.push('Status must be one of: applied, interview, offer, rejected');
    } else {
      cleanData.status = data.status;
    }
  }

  if (data.applied_date !== undefined) {
    if (!validator.isDate(data.applied_date)) {
      errors.push('Applied date must be a valid date');
    } else {
      cleanData.applied_date = data.applied_date;
    }
  }

  if (data.description !== undefined && typeof data.description === 'string') {
    cleanData.description = data.description.trim();
  }

  if (data.salary_range !== undefined && typeof data.salary_range === 'string') {
    cleanData.salary_range = data.salary_range.trim();
  }

  if (data.location !== undefined && typeof data.location === 'string') {
    cleanData.location = data.location.trim();
  }

  if (data.job_url !== undefined) {
    if (data.job_url && typeof data.job_url === 'string') {
      if (!validator.isURL(data.job_url, { require_protocol: true })) {
        errors.push('Job URL must be a valid URL');
      } else {
        cleanData.job_url = data.job_url.trim();
      }
    } else {
      cleanData.job_url = null; // Allow clearing the URL
    }
  }

  if (data.source !== undefined && typeof data.source === 'string') {
    const validSources = ['manual', 'email', 'imported'];
    if (!validSources.includes(data.source)) {
      errors.push('Source must be one of: manual, email, imported');
    } else {
      cleanData.source = data.source;
    }
  }

  return {
    isValid: errors.length === 0,
    data: cleanData,
    errors
  };
}

/**
 * Validate email tracking data
 */
function validateEmailTracking(data) {
  const errors = [];
  const cleanData = {};

  // Required fields
  if (!data.gmail_message_id || typeof data.gmail_message_id !== 'string') {
    errors.push('Gmail message ID is required');
  } else {
    cleanData.gmail_message_id = data.gmail_message_id.trim();
  }

  if (!data.gmail_thread_id || typeof data.gmail_thread_id !== 'string') {
    errors.push('Gmail thread ID is required');
  } else {
    cleanData.gmail_thread_id = data.gmail_thread_id.trim();
  }

  if (!data.subject || typeof data.subject !== 'string') {
    errors.push('Subject is required');
  } else {
    cleanData.subject = data.subject.trim();
  }

  if (!data.sender_email || typeof data.sender_email !== 'string') {
    errors.push('Sender email is required');
  } else if (!validator.isEmail(data.sender_email)) {
    errors.push('Sender email must be valid');
  } else {
    cleanData.sender_email = data.sender_email.trim().toLowerCase();
  }

  if (!data.received_date || !validator.isISO8601(data.received_date)) {
    errors.push('Received date must be a valid ISO date');
  } else {
    cleanData.received_date = data.received_date;
  }

  // Optional fields
  if (data.sender_name && typeof data.sender_name === 'string') {
    cleanData.sender_name = data.sender_name.trim();
  }

  if (data.confidence_score !== undefined) {
    const score = parseFloat(data.confidence_score);
    if (isNaN(score) || score < 0 || score > 1) {
      errors.push('Confidence score must be between 0 and 1');
    } else {
      cleanData.confidence_score = score;
    }
  }

  if (data.processing_notes && typeof data.processing_notes === 'string') {
    cleanData.processing_notes = data.processing_notes.trim();
  }

  return {
    isValid: errors.length === 0,
    data: cleanData,
    errors
  };
}

module.exports = {
  validateJob,
  validateJobUpdate,
  validateEmailTracking
};