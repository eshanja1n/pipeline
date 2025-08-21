const { supabaseAdmin, corsHandler, authenticateToken, handleError } = require('../_config');
const { google } = require('googleapis');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

// Initialize AWS Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

module.exports = async (req, res) => {
  corsHandler(req, res);
  
  if (req.method === 'OPTIONS') return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication required
  const auth = await authenticateToken(req, res);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { userId } = auth;
  const { access_token, options = {} } = req.body;

  try {
    console.log('🚀 EMAIL SYNC REQUEST RECEIVED');
    console.log(`   User ID: ${userId}`);
    console.log(`   Access token provided: ${!!access_token}`);
    console.log(`   Options:`, options);

    if (!access_token) {
      return res.status(400).json({
        error: 'Access token required',
        code: 'MISSING_ACCESS_TOKEN'
      });
    }

    console.log(`📧 Starting simple email sync for user ${userId}...`);

    const result = await syncEmailsForUser(userId, access_token, options);

    console.log('✅ Email sync completed successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Email sync failed:', error);
    handleError(res, error, 'Email sync failed');
  }
};

async function syncEmailsForUser(userId, accessToken, options = {}) {
  console.log(`🔄 Starting email sync for user: ${userId}`);
  console.log(`   Options:`, options);

  // Get user's last sync timestamp
  const lastSyncTimestamp = await getLastSyncTimestamp(userId);
  console.log(`🕐 User's last sync timestamp: ${lastSyncTimestamp}`);

  // Prepare Gmail query with timestamp filtering
  let query = options.query || '';
  if (lastSyncTimestamp) {
    const timestamp = Math.floor(new Date(lastSyncTimestamp).getTime() / 1000);
    query = `after:${timestamp}`;
    console.log(`   Updated search query with timestamp: "${query}"`);
    console.log(`   This will only fetch emails after: ${new Date(timestamp * 1000).toISOString()}`);
  }

  // Fetch emails from Gmail
  const gmailOptions = {
    query,
    maxResults: options.maxResults || 50
  };

  console.log(`📬 Gmail API: Starting email fetch with options:`, gmailOptions);
  const gmailResult = await fetchEmailsFromGmail(accessToken, gmailOptions);

  console.log('📊 Gmail sync results:');
  console.log(`   Total emails found: ${gmailResult.totalFound}`);
  console.log(`   Next page token: ${gmailResult.nextPageToken || 'none'}`);

  // Process each email
  let processedCount = 0;
  let newJobsCreated = 0;

  if (gmailResult.messages && gmailResult.messages.length > 0) {
    for (const message of gmailResult.messages) {
      try {
        console.log(`🔍 Checking email ${message.id}...`);
        
        // Check if email is already processed
        const isAlreadyTracked = await isEmailTracked(userId, message.id);
        console.log(`🔍 Checking if email ${message.id} is already tracked for user ${userId}...`);
        
        if (isAlreadyTracked) {
          console.log(`   ✅ Already tracked`);
          continue;
        }

        console.log(`   ❌ Not tracked`);
        console.log(`   ✨ Email ${message.id} is new, processing...`);

        // Get full email content
        const emailContent = await getEmailContent(accessToken, message.id);
        
        // Store email data
        const emailRecord = await storeEmailData(userId, message.id, emailContent);
        
        processedCount++;
        console.log(`   ✅ Email ${message.id} stored successfully`);

        // Analyze email with LLM (simplified for serverless)
        // Note: In production, you might want to queue this for background processing
        // For now, we'll do basic job detection inline
        
      } catch (error) {
        console.error(`❌ Error processing email ${message.id}:`, error);
        continue;
      }
    }
  }

  // Update user's last sync timestamp
  await updateLastSyncTimestamp(userId);

  return {
    success: true,
    totalFound: gmailResult.totalFound,
    processedCount,
    newJobsCreated,
    nextPageToken: gmailResult.nextPageToken
  };
}

async function getLastSyncTimestamp(userId) {
  console.log(`📅 Getting last sync timestamp for user: ${userId}`);
  
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('last_sync_timestamp')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching last sync timestamp:', error);
    return null;
  }

  const timestamp = user?.last_sync_timestamp;
  console.log(`   Last sync timestamp: ${timestamp || 'none'}`);
  return timestamp;
}

async function fetchEmailsFromGmail(accessToken, options) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  console.log(`🔍 Gmail API: Executing query "${options.query}" with maxResults=${options.maxResults}`);

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: options.query,
    maxResults: options.maxResults
  });

  const messages = response.data.messages || [];
  console.log(`📨 Gmail API: Found ${messages.length} messages`);
  console.log(`   Next page token: ${response.data.nextPageToken || 'none'}`);
  console.log(`   Result size estimate: ${response.data.resultSizeEstimate}`);

  return {
    messages,
    totalFound: messages.length,
    nextPageToken: response.data.nextPageToken
  };
}

async function isEmailTracked(userId, gmailId) {
  const { data: tracking, error } = await supabaseAdmin
    .from('email_tracking')
    .select('id')
    .eq('user_id', userId)
    .eq('gmail_id', gmailId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking email tracking:', error);
    return false;
  }

  return !!tracking;
}

async function getEmailContent(accessToken, messageId) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  console.log(`📧 Gmail API: Fetching full content for message ID: ${messageId}`);

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  });

  const message = response.data;
  const headers = message.payload.headers || [];

  // Extract headers
  const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
  const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
  const to = headers.find(h => h.name.toLowerCase() === 'to')?.value || '';
  const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';

  // Extract body content (simplified)
  let textContent = '';
  let htmlContent = '';

  const extractContent = (part) => {
    if (part.body && part.body.data) {
      const content = Buffer.from(part.body.data, 'base64').toString('utf-8');
      if (part.mimeType === 'text/plain') {
        textContent += content;
      } else if (part.mimeType === 'text/html') {
        htmlContent += content;
      }
    }

    if (part.parts) {
      part.parts.forEach(extractContent);
    }
  };

  if (message.payload.parts) {
    message.payload.parts.forEach(extractContent);
  } else if (message.payload.body) {
    extractContent(message.payload);
  }

  console.log(`✅ Gmail API: Successfully extracted email content:`);
  console.log(`   Subject: ${subject}`);
  console.log(`   From: ${from}`);
  console.log(`   Date: ${date}`);
  console.log(`   Text content length: ${textContent.length} chars`);
  console.log(`   HTML content length: ${htmlContent.length} chars`);

  return {
    subject,
    from,
    to,
    date,
    textContent,
    htmlContent,
    gmailId: messageId
  };
}

async function storeEmailData(userId, gmailId, emailContent) {
  console.log(`   💾 Storing email data for ${gmailId}...`);

  console.log('💾 Storing email data with new schema:');
  console.log(`   User: ${userId}`);
  console.log(`   Gmail ID: ${gmailId}`);
  console.log(`   Subject: ${emailContent.subject}`);
  console.log(`   From: ${emailContent.from}`);

  // Store in emails table
  console.log('💾 Storing new email in emails table...');
  const { data: email, error: emailError } = await supabaseAdmin
    .from('emails')
    .insert([{
      user_id: userId,
      gmail_id: gmailId,
      subject: emailContent.subject,
      from_email: emailContent.from,
      to_email: emailContent.to,
      sent_date: emailContent.date,
      text_content: emailContent.textContent,
      html_content: emailContent.htmlContent,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (emailError) {
    console.error('Error storing email:', emailError);
    throw emailError;
  }

  console.log(`✅ Email stored with ID: ${email.id}`);

  // Create tracking record
  console.log(`💾 Creating email tracking record for user ${userId}...`);
  const { data: tracking, error: trackingError } = await supabaseAdmin
    .from('email_tracking')
    .insert([{
      user_id: userId,
      gmail_id: gmailId,
      email_id: email.id,
      is_job_related: false, // Will be updated by LLM analysis
      is_processed: false,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (trackingError) {
    console.error('Error creating tracking record:', trackingError);
    throw trackingError;
  }

  console.log(`✅ Email tracking record created with ID: ${tracking.id}`);

  return { email, tracking };
}

async function updateLastSyncTimestamp(userId) {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ 
      last_sync_timestamp: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating last sync timestamp:', error);
    throw error;
  }

  console.log(`✅ Updated last sync timestamp for user ${userId}`);
}