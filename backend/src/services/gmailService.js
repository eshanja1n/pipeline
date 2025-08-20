const { google } = require('googleapis');
const { supabaseAdmin } = require('../config/supabase');

class GmailService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Set credentials for the OAuth2 client
   */
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Get Gmail API instance with authenticated client
   */
  getGmailInstance() {
    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Get user's Gmail profile
   */
  async getProfile() {
    try {
      const gmail = this.getGmailInstance();
      const response = await gmail.users.getProfile({ userId: 'me' });
      return response.data;
    } catch (error) {
      console.error('Error getting Gmail profile:', error);
      throw new Error('Failed to get Gmail profile');
    }
  }

  /**
   * Fetch emails with optional query parameters
   */
  async fetchEmails(options = {}) {
    try {
      console.log(`📬 Gmail API: Starting email fetch with options:`, options);
      
      const {
        query = '',
        maxResults = 50,
        pageToken = null,
        labelIds = [],
        includeSpamTrash = false
      } = options;

      const gmail = this.getGmailInstance();
      
      const listParams = {
        userId: 'me',
        maxResults,
        includeSpamTrash,
        q: query
      };

      if (pageToken) {
        listParams.pageToken = pageToken;
      }

      if (labelIds.length > 0) {
        listParams.labelIds = labelIds;
      }

      console.log(`🔍 Gmail API: Executing query "${query}" with maxResults=${maxResults}`);
      
      const response = await gmail.users.messages.list(listParams);
      
      const messageCount = response.data.messages?.length || 0;
      console.log(`📨 Gmail API: Found ${messageCount} messages`);
      console.log(`   Next page token: ${response.data.nextPageToken || 'none'}`);
      console.log(`   Result size estimate: ${response.data.resultSizeEstimate || 'unknown'}`);
      
      return {
        messages: response.data.messages || [],
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate
      };
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw new Error('Failed to fetch emails from Gmail');
    }
  }

  /**
   * Get detailed email content by message ID
   */
  async getEmailContent(messageId) {
    try {
      console.log(`📧 Gmail API: Fetching full content for message ID: ${messageId}`);
      
      const gmail = this.getGmailInstance();
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      
      // Extract email metadata
      const headers = message.payload.headers;
      const subject = this.getHeader(headers, 'Subject') || '';
      const from = this.getHeader(headers, 'From') || '';
      const to = this.getHeader(headers, 'To') || '';
      const date = this.getHeader(headers, 'Date') || '';
      const emailMessageId = this.getHeader(headers, 'Message-ID') || '';

      // Extract sender info
      const senderMatch = from.match(/(.+?)\s*<(.+?)>/);
      const senderName = senderMatch ? senderMatch[1].trim().replace(/"/g, '') : from;
      const senderEmail = senderMatch ? senderMatch[2].trim() : from;

      // Extract email body
      const { textContent, htmlContent } = this.extractEmailBody(message.payload);

      // Extract attachments info
      const attachments = this.extractAttachments(message.payload);

      console.log(`✅ Gmail API: Successfully extracted email content:`);
      console.log(`   Subject: ${subject}`);
      console.log(`   From: ${senderName} <${senderEmail}>`);
      console.log(`   Date: ${date}`);
      console.log(`   Text content length: ${textContent?.length || 0} chars`);
      console.log(`   HTML content length: ${htmlContent?.length || 0} chars`);

      return {
        id: message.id,
        threadId: message.threadId,
        subject,
        senderName,
        senderEmail,
        to,
        date: new Date(date).toISOString(),
        messageId: emailMessageId,
        textContent,
        htmlContent,
        attachments,
        headers: this.extractImportantHeaders(headers),
        internalDate: new Date(parseInt(message.internalDate)).toISOString()
      };
    } catch (error) {
      console.error('Error getting email content:', error);
      throw new Error('Failed to get email content');
    }
  }

  /**
   * Sync emails for a specific user
   */
  async syncUserEmails(userId, accessToken, options = {}) {
    try {
      console.log(`🔄 Starting email sync for user: ${userId}`);
      console.log(`   Options:`, options);
      
      // Set credentials with the user's access token
      this.setCredentials({ access_token: accessToken });

      const {
        query = 'newer_than:30d', // Default: emails from last 30 days
        maxResults = 100
      } = options;

      // Get the user's last sync timestamp from users table
      const lastSync = await this.getUserLastSyncTimestamp(userId);
      let searchQuery = query;
      
      console.log(`🕐 User's last sync timestamp: ${lastSync || 'never'}`);
      
      if (lastSync) {
        const lastSyncDate = Math.floor(new Date(lastSync).getTime() / 1000);
        searchQuery = `after:${lastSyncDate}`;
        console.log(`   Updated search query with timestamp: "${searchQuery}"`);
        console.log(`   This will only fetch emails after: ${new Date(lastSync).toISOString()}`);
      } else {
        console.log(`   First sync for user - using default search query: "${searchQuery}"`);
      }

      // Fetch email list
      const emailList = await this.fetchEmails({
        query: searchQuery,
        maxResults
      });

      console.log(`📊 Gmail sync results:`);
      console.log(`   Total emails found: ${emailList.messages?.length || 0}`);
      console.log(`   Next page token: ${emailList.nextPageToken || 'none'}`);

      let processedCount = 0;
      let newEmails = [];

      // Process each email
      for (const emailRef of emailList.messages || []) {
        try {
          console.log(`🔍 Checking email ${emailRef.id}...`);
          
          // Check if email is already tracked
          const isTracked = await this.isEmailTracked(userId, emailRef.id);
          if (isTracked) {
            console.log(`   ⏭️ Email ${emailRef.id} already tracked, skipping`);
            continue;
          }
          
          console.log(`   ✨ Email ${emailRef.id} is new, processing...`);

          // Get full email content
          const emailContent = await this.getEmailContent(emailRef.id);
          
          // Store email tracking and content
          console.log(`   💾 Storing email data for ${emailRef.id}...`);
          const emailRecord = await this.storeEmailData(userId, emailContent);
          console.log(`   ✅ Email ${emailRef.id} stored successfully`);
          
          newEmails.push(emailRecord);
          processedCount++;

          // Rate limiting - small delay between requests
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error processing email ${emailRef.id}:`, error);
          // Continue with next email
        }
      }

      // Update last sync timestamp
      await this.updateLastSyncTimestamp(userId);

      console.log(`🎉 Email sync completed for user ${userId}:`);
      console.log(`   Total found: ${emailList.messages?.length || 0}`);
      console.log(`   New emails processed: ${processedCount}`);
      console.log(`   New emails for LLM analysis: ${newEmails.length}`);

      return {
        success: true,
        processedCount,
        totalFound: emailList.messages?.length || 0,
        newEmails: newEmails, // Return all new emails for LLM analysis
        newEmailsPreview: newEmails.slice(0, 10), // First 10 for UI preview
        nextPageToken: emailList.nextPageToken
      };

    } catch (error) {
      console.error('Error syncing user emails:', error);
      throw error;
    }
  }

  /**
   * Helper: Get header value by name
   */
  getHeader(headers, name) {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : null;
  }

  /**
   * Helper: Extract email body content
   */
  extractEmailBody(payload) {
    let textContent = '';
    let htmlContent = '';

    const extractParts = (parts) => {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          textContent += Buffer.from(part.body.data, 'base64').toString('utf8');
        } else if (part.mimeType === 'text/html' && part.body.data) {
          htmlContent += Buffer.from(part.body.data, 'base64').toString('utf8');
        } else if (part.parts) {
          extractParts(part.parts);
        }
      }
    };

    if (payload.parts) {
      extractParts(payload.parts);
    } else if (payload.body && payload.body.data) {
      if (payload.mimeType === 'text/plain') {
        textContent = Buffer.from(payload.body.data, 'base64').toString('utf8');
      } else if (payload.mimeType === 'text/html') {
        htmlContent = Buffer.from(payload.body.data, 'base64').toString('utf8');
      }
    }

    return { textContent, htmlContent };
  }

  /**
   * Helper: Extract attachment information
   */
  extractAttachments(payload) {
    const attachments = [];

    const extractParts = (parts) => {
      for (const part of parts) {
        if (part.filename && part.filename.length > 0) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size || 0,
            attachmentId: part.body.attachmentId
          });
        } else if (part.parts) {
          extractParts(part.parts);
        }
      }
    };

    if (payload.parts) {
      extractParts(payload.parts);
    }

    return attachments;
  }

  /**
   * Helper: Extract important headers
   */
  extractImportantHeaders(headers) {
    const important = {};
    const headerNames = ['Message-ID', 'In-Reply-To', 'References', 'List-ID', 'Return-Path'];
    
    for (const name of headerNames) {
      const value = this.getHeader(headers, name);
      if (value) {
        important[name.toLowerCase()] = value;
      }
    }

    return important;
  }

  /**
   * Check if email is already tracked for this user
   */
  async isEmailTracked(userId, gmailMessageId) {
    console.log(`🔍 Checking if email ${gmailMessageId} is already tracked for user ${userId}...`);
    
    // First check if the email exists in emails table, then check if user has tracking record
    const { data, error } = await supabaseAdmin
      .from('email_tracking')
      .select(`
        id,
        email:emails!inner(gmail_message_id)
      `)
      .eq('user_id', userId)
      .eq('emails.gmail_message_id', gmailMessageId)
      .single();

    const isTracked = !error && data;
    console.log(`   ${isTracked ? '✅ Already tracked' : '❌ Not tracked'}`);
    
    return isTracked;
  }

  /**
   * Store email data in database using new schema
   */
  async storeEmailData(userId, emailContent) {
    console.log(`💾 Storing email data with new schema:`);
    console.log(`   User: ${userId}`);
    console.log(`   Gmail ID: ${emailContent.id}`);
    console.log(`   Subject: ${emailContent.subject}`);
    console.log(`   From: ${emailContent.senderEmail}`);
    
    // Step 1: Check if email already exists in emails table
    const { data: existingEmail } = await supabaseAdmin
      .from('emails')
      .select('id')
      .eq('gmail_message_id', emailContent.id)
      .single();

    let emailRecord;
    
    if (existingEmail) {
      console.log(`📧 Email ${emailContent.id} already exists in emails table`);
      emailRecord = existingEmail;
    } else {
      // Step 2: Store email in emails table (global storage)
      console.log(`💾 Storing new email in emails table...`);
      const { data: newEmail, error: emailError } = await supabaseAdmin
        .from('emails')
        .insert({
          gmail_message_id: emailContent.id,
          gmail_thread_id: emailContent.threadId,
          subject: emailContent.subject,
          sender_email: emailContent.senderEmail,
          sender_name: emailContent.senderName,
          recipient_email: emailContent.to,
          received_date: emailContent.internalDate,
          plain_text_content: emailContent.textContent,
          html_content: emailContent.htmlContent,
          attachments: emailContent.attachments || [],
          headers: emailContent.headers || {}
        })
        .select()
        .single();

      if (emailError) {
        console.error(`❌ Failed to store email:`, emailError);
        throw new Error(`Failed to store email: ${emailError.message}`);
      }

      console.log(`✅ Email stored with ID: ${newEmail.id}`);
      emailRecord = newEmail;
    }

    // Step 3: Create email tracking record for this user
    console.log(`💾 Creating email tracking record for user ${userId}...`);
    const { data: trackingRecord, error: trackingError } = await supabaseAdmin
      .from('email_tracking')
      .insert({
        user_id: userId,
        email_id: emailRecord.id,
        is_processed: false
      })
      .select()
      .single();

    if (trackingError) {
      console.error(`❌ Failed to store email tracking:`, trackingError);
      throw new Error(`Failed to store email tracking: ${trackingError.message}`);
    }

    console.log(`✅ Email tracking record created with ID: ${trackingRecord.id}`);
    
    // Return the tracking record with email info for LLM processing
    return {
      ...trackingRecord,
      email: emailRecord
    };
  }

  /**
   * Get last sync timestamp for user from users table
   */
  async getUserLastSyncTimestamp(userId) {
    console.log(`📅 Getting last sync timestamp for user: ${userId}`);
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('last_sync_enabled_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(`❌ Error getting user sync timestamp:`, error);
      return null;
    }

    console.log(`   Last sync timestamp: ${data?.last_sync_enabled_at || 'never'}`);
    return data?.last_sync_enabled_at;
  }

  /**
   * Update user's last sync timestamp in users table
   */
  async updateLastSyncTimestamp(userId) {
    const now = new Date().toISOString();
    console.log(`📅 Updating last sync timestamp for user ${userId} to: ${now}`);
    
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        last_sync_enabled_at: now,
        updated_at: now
      })
      .eq('id', userId);

    if (error) {
      console.error(`❌ Error updating user sync timestamp:`, error);
      throw new Error(`Failed to update sync timestamp: ${error.message}`);
    }

    console.log(`✅ Last sync timestamp updated successfully`);
    return now;
  }
}

module.exports = new GmailService();