const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { supabaseAdmin } = require('../config/supabase');

class LLMService {
  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    // Model configuration
    this.modelId = 'anthropic.claude-3-haiku-20240307-v1:0'; // Fast and cost-effective for email analysis
    this.maxTokens = 1000;
    this.temperature = 0.1; // Low temperature for consistent analysis
  }

  /**
   * Two-step email analysis: 1) Check if job-related, 2) If yes, match to existing jobs
   */
  async analyzeEmail(emailTrackingId) {
    try {
      console.log(`🔍 Starting two-step email analysis for ID: ${emailTrackingId}`);
      
      // Get email content and basic info
      const emailData = await this.getEmailForAnalysis(emailTrackingId);
      if (!emailData) {
        throw new Error('Email not found or unauthorized');
      }

      const { email, emailTracking, userId } = emailData;

      // Log what we're analyzing
      console.log(`📧 Email being analyzed:`);
      console.log(`   From: ${email.sender_email} (${email.sender_name || 'Unknown'})`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   Date: ${email.received_date}`);
      console.log(`   Content length: ${email.plain_text_content?.length || 0} characters`);

      // STEP 1: Determine if email is job-related
      console.log(`🔍 STEP 1: Checking if email is job-related...`);
      const jobRelatedResult = await this.checkIfJobRelated(email);
      
      console.log(`📊 Job-related analysis result:`, {
        is_job_related: jobRelatedResult.is_job_related,
        reasoning: jobRelatedResult.reasoning?.substring(0, 100) + '...'
      });

      // Update tracking with job-related status
      await this.updateEmailAnalysis(emailTrackingId, {
        is_job_related: jobRelatedResult.is_job_related,
        is_processed: true
      });

      let finalResult = {
        is_job_related: jobRelatedResult.is_job_related,
        reasoning: jobRelatedResult.reasoning,
        job_match: null,
        job_updated: false
      };

      // STEP 2: If job-related, try to match to existing jobs and update status
      if (jobRelatedResult.is_job_related) {
        console.log(`🔍 STEP 2: Email is job-related, checking for job matches...`);
        
        const userJobs = await this.getUserJobs(userId);
        console.log(`   User has ${userJobs.length} existing jobs`);

        if (userJobs.length > 0) {
          const jobMatchResult = await this.matchEmailToJob(email, userJobs);
          
          if (jobMatchResult.matched_job_id) {
            console.log(`✅ Matched email to job: ${jobMatchResult.matched_job_id}`);
            
            // Always link email to the matched job
            await this.updateEmailAnalysis(emailTrackingId, {
              job_id: jobMatchResult.matched_job_id
            });
            
            finalResult.job_match = jobMatchResult;
            
            // Update the job status if suggested
            if (jobMatchResult.suggested_status) {
              await this.updateJobStatus(jobMatchResult.matched_job_id, jobMatchResult.suggested_status, userId);
              console.log(`📝 Updated job ${jobMatchResult.matched_job_id} status to: ${jobMatchResult.suggested_status}`);
              finalResult.job_updated = true;
            } else {
              console.log(`📋 Email linked to job but no status update suggested`);
              finalResult.job_updated = false;
            }
          } else {
            console.log(`ℹ️ No matching job found for this email`);
            console.log(`🆕 Attempting to create new job from email...`);
            
            // Try to extract job information and create a new job
            const newJobResult = await this.createJobFromEmail(email, userId);
            if (newJobResult.success) {
              console.log(`✅ Created new job: ${newJobResult.job_id}`);
              
              // Update email tracking to link to new job
              await this.updateEmailAnalysis(emailTrackingId, {
                job_id: newJobResult.job_id
              });
              
              finalResult.job_match = {
                matched_job_id: newJobResult.job_id,
                suggested_status: newJobResult.status,
                reasoning: newJobResult.reasoning
              };
              finalResult.job_updated = true;
            } else {
              console.log(`❌ Failed to create job from email: ${newJobResult.reasoning}`);
            }
          }
        } else {
          console.log(`ℹ️ User has no existing jobs to match against`);
          console.log(`🆕 Attempting to create new job from email...`);
          
          // Try to extract job information and create a new job
          const newJobResult = await this.createJobFromEmail(email, userId);
          if (newJobResult.success) {
            console.log(`✅ Created new job: ${newJobResult.job_id}`);
            
            // Update email tracking to link to new job
            await this.updateEmailAnalysis(emailTrackingId, {
              job_id: newJobResult.job_id
            });
            
            finalResult.job_match = {
              matched_job_id: newJobResult.job_id,
              suggested_status: newJobResult.status,
              reasoning: newJobResult.reasoning
            };
            finalResult.job_updated = true;
          } else {
            console.log(`❌ Failed to create job from email: ${newJobResult.reasoning}`);
          }
        }
      }

      console.log(`🎉 Two-step analysis completed:`, finalResult);
      return finalResult;

    } catch (error) {
      console.error('❌ Error analyzing email:', error);
      throw error;
    }
  }

  /**
   * Batch analyze multiple emails
   */
  async analyzeEmailBatch(emailTrackingIds, userId) {
    console.log(`📊 BATCH ANALYSIS STARTED`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Email count: ${emailTrackingIds.length}`);
    console.log(`   Email IDs: ${emailTrackingIds.join(', ')}`);
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < emailTrackingIds.length; i++) {
      const emailId = emailTrackingIds[i];
      console.log(`🔄 Processing email ${i + 1}/${emailTrackingIds.length}: ${emailId}`);
      
      try {
        // Verify ownership
        const { data: email } = await supabaseAdmin
          .from('email_tracking')
          .select('id')
          .eq('id', emailId)
          .eq('user_id', userId)
          .single();

        if (!email) {
          console.log(`❌ Email ${emailId} not found or unauthorized`);
          results.push({
            emailId,
            success: false,
            error: 'Email not found or unauthorized'
          });
          errorCount++;
          continue;
        }

        console.log(`✅ Email ${emailId} ownership verified, analyzing...`);
        const analysis = await this.analyzeEmail(emailId);
        results.push({
          emailId,
          success: true,
          analysis
        });
        successCount++;

        // Small delay to avoid rate limiting
        console.log(`⏱️ Waiting 500ms before next analysis...`);
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ Error analyzing email ${emailId}:`, error);
        results.push({
          emailId,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }

    console.log(`🎉 BATCH ANALYSIS COMPLETED`);
    console.log(`   Total processed: ${emailTrackingIds.length}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Success rate: ${Math.round((successCount / emailTrackingIds.length) * 100)}%`);

    return results;
  }

  /**
   * Get email content and tracking info for analysis (new schema)
   */
  async getEmailForAnalysis(emailTrackingId) {
    // Get email tracking with related email content
    const { data: emailTracking, error: trackingError } = await supabaseAdmin
      .from('email_tracking')
      .select(`
        *,
        email:emails(*)
      `)
      .eq('id', emailTrackingId)
      .single();

    if (trackingError || !emailTracking) {
      console.error('Error fetching email tracking:', trackingError);
      return null;
    }

    return {
      emailTracking,
      email: emailTracking.email,
      userId: emailTracking.user_id
    };
  }

  /**
   * Step 1: Check if email is job-related
   */
  async checkIfJobRelated(email) {
    const prompt = `You are an AI assistant that determines if emails are related to job applications.

EMAIL TO ANALYZE:
From: ${email.sender_email} (${email.sender_name || 'Unknown'})
Subject: ${email.subject}
Date: ${email.received_date}

Content:
${(email.plain_text_content || email.html_content || '').substring(0, 2000)}

TASK:
Analyze this email and respond with a JSON object containing:
1. "is_job_related": boolean - Is this email related to job applications, interviews, or hiring?
2. "reasoning": string - Brief explanation of your analysis

GUIDELINES:
- Only mark as job-related if clearly about employment, interviews, job applications, or hiring
- Marketing emails from job sites are NOT job-related unless they contain specific application updates
- Newsletters and general company updates are NOT job-related
- Be conservative - when in doubt, mark as not job-related

Respond only with valid JSON:`;

    const response = await this.invokeBedrockModel(prompt);
    return this.parseJobRelatedResult(response);
  }

  /**
   * Create new job from job-related email
   */
  async createJobFromEmail(email, userId) {
    const prompt = `You are an AI assistant that extracts job application information from emails.

EMAIL TO ANALYZE:
From: ${email.sender_email} (${email.sender_name || 'Unknown'})
Subject: ${email.subject}
Date: ${email.received_date}

Content:
${(email.plain_text_content || email.html_content || '').substring(0, 2000)}

TASK:
Extract job information and respond with a JSON object containing:
1. "success": boolean - Can you extract enough info to create a job?
2. "company": string - Company name (required)
3. "role": string - Job title/position (required) 
4. "status": string - Current status ("applied", "interview", "offer", "rejected")
5. "description": string - Brief job description (optional)
6. "location": string - Job location (optional)
7. "reasoning": string - Brief explanation of extraction

GUIDELINES:
- Only set success=true if you can identify both company and role clearly
- Extract company name from sender domain, sender name, or email content
- Extract role/position from subject line or email content
- Infer the most appropriate status based on email content:
  * "applied" - if it's an application confirmation or acknowledgment
  * "interview" - if scheduling/confirming interviews or phone screens
  * "offer" - if presenting job offers or congratulating on selection
  * "rejected" - if explicitly rejecting or declining
- Default to "applied" if status is unclear but it's clearly job-related
- Be more liberal with extraction - if it's clearly about a job application, try to extract what you can

Respond only with valid JSON:`;

    const response = await this.invokeBedrockModel(prompt);
    const extractionResult = this.parseJobExtractionResult(response);
    
    if (extractionResult.success) {
      try {
        // Create the job in database
        const { data: newJob, error } = await supabaseAdmin
          .from('jobs')
          .insert({
            user_id: userId,
            company: extractionResult.company,
            role: extractionResult.role,
            status: extractionResult.status || 'applied',
            description: extractionResult.description || '',
            location: extractionResult.location || '',
            applied_date: new Date().toISOString().split('T')[0], // Use DATE format
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating job from email:', error);
          return {
            success: false,
            reasoning: `Database error: ${error.message}`
          };
        }

        return {
          success: true,
          job_id: newJob.id,
          company: newJob.company,
          role: newJob.role,
          status: newJob.status,
          reasoning: extractionResult.reasoning
        };

      } catch (error) {
        console.error('Error in createJobFromEmail:', error);
        return {
          success: false,
          reasoning: `Failed to create job: ${error.message}`
        };
      }
    }

    return extractionResult;
  }

  /**
   * Step 2: Match email to existing job and suggest status update
   */
  async matchEmailToJob(email, userJobs) {
    const jobsContext = userJobs.map(job => 
      `ID: ${job.id}, Company: ${job.company}, Role: ${job.role}, Status: ${job.status}, Applied: ${job.applied_date}`
    ).join('\n');

    const prompt = `You are an AI assistant that matches job-related emails to existing job applications.

USER'S JOB APPLICATIONS:
${jobsContext}

EMAIL TO MATCH:
From: ${email.sender_email} (${email.sender_name || 'Unknown'})
Subject: ${email.subject}
Date: ${email.received_date}

Content:
${(email.plain_text_content || email.html_content || '').substring(0, 2000)}

TASK:
Analyze this email and respond with a JSON object containing:
1. "matched_job_id": string or null - ID of the matching job application
2. "suggested_status": string or null - New status if applicable ("applied", "interview", "offer", "rejected")
3. "reasoning": string - Brief explanation of your analysis

GUIDELINES:
- ONLY match if the email is clearly about an EXISTING job application that the user already has in their list
- DO NOT match if the email is about a NEW job application, even if company/role seem similar
- Look for these indicators of NEW applications (should NOT match):
  * "your application was sent"
  * "we received your application" 
  * "thank you for applying"
  * "application submitted"
  * Recent application confirmations
- Only match for follow-ups to existing applications:
  * Interview scheduling for jobs already applied to
  * Status updates on pending applications
  * Rejections/offers for applications in progress
- Match based on EXACT company name and similar role
- Only suggest status changes if the email clearly indicates a status update:
  * "interview" - if scheduling/confirming interviews, phone screens, or technical rounds
  * "offer" - if presenting job offers, salary discussions, or congratulating on selection
  * "rejected" - if explicitly rejecting, saying "unfortunately", or "we regret to inform"
  * Leave null if email is just informational or doesn't indicate status change
- When in doubt, return null for matched_job_id to create a new job instead

Respond only with valid JSON:`;

    const response = await this.invokeBedrockModel(prompt);
    return this.parseJobMatchResult(response);
  }

  /**
   * Get user's jobs for matching
   */
  async getUserJobs(userId) {
    const { data: jobs, error } = await supabaseAdmin
      .from('jobs')
      .select('id, company, role, status, applied_date, description')
      .eq('user_id', userId)
      .order('applied_date', { ascending: false });

    if (error) {
      console.error('Error fetching user jobs:', error);
      return [];
    }

    return jobs || [];
  }

  /**
   * Update job status
   */
  async updateJobStatus(jobId, newStatus, userId) {
    const { error } = await supabaseAdmin
      .from('jobs')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update job status: ${error.message}`);
    }
  }


  /**
   * Invoke Bedrock model with the prompt
   */
  async invokeBedrockModel(prompt) {
    console.log(`🤖 BEDROCK API CALL INITIATED`);
    console.log(`   Model ID: ${this.modelId}`);
    console.log(`   Max tokens: ${this.maxTokens}`);
    console.log(`   Temperature: ${this.temperature}`);
    console.log(`   Prompt length: ${prompt.length} characters`);
    
    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };

    console.log(`📤 Sending request to Bedrock...`);
    console.log(`   Request body size: ${JSON.stringify(requestBody).length} bytes`);

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody)
    });

    try {
      const startTime = Date.now();
      const response = await this.bedrockClient.send(command);
      const endTime = Date.now();
      
      console.log(`📥 Bedrock response received in ${endTime - startTime}ms`);
      console.log(`   Response status: ${response.$metadata?.httpStatusCode || 'unknown'}`);
      console.log(`   Request ID: ${response.$metadata?.requestId || 'unknown'}`);
      
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      console.log(`✅ BEDROCK API CALL SUCCESSFUL`);
      console.log(`   Response tokens: ${responseBody.usage?.output_tokens || 'unknown'}`);
      console.log(`   Input tokens: ${responseBody.usage?.input_tokens || 'unknown'}`);
      console.log(`   Response length: ${responseBody.content[0].text.length} characters`);
      console.log(`   Raw response preview: ${responseBody.content[0].text.substring(0, 200)}...`);
      
      return responseBody.content[0].text;
      
    } catch (error) {
      console.error(`❌ BEDROCK API CALL FAILED:`, error);
      console.error(`   Error type: ${error.name}`);
      console.error(`   Error message: ${error.message}`);
      console.error(`   Error code: ${error.code || 'unknown'}`);
      console.error(`   Request ID: ${error.$metadata?.requestId || 'unknown'}`);
      throw error;
    }
  }

  /**
   * Parse job-related analysis result
   */
  parseJobRelatedResult(analysisText) {
    try {
      const result = JSON.parse(analysisText);
      
      // Validate required fields
      if (typeof result.is_job_related !== 'boolean') {
        throw new Error('is_job_related must be boolean');
      }

      if (!result.reasoning || typeof result.reasoning !== 'string') {
        throw new Error('reasoning must be a string');
      }

      return result;

    } catch (error) {
      console.error('Error parsing job-related LLM response:', error);
      console.error('Raw response:', analysisText);
      
      return {
        is_job_related: false,
        reasoning: `Failed to parse LLM response: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * Parse job extraction result
   */
  parseJobExtractionResult(analysisText) {
    try {
      const result = JSON.parse(analysisText);
      
      // Validate required fields
      if (typeof result.success !== 'boolean') {
        throw new Error('success must be boolean');
      }

      if (result.success) {
        if (!result.company || typeof result.company !== 'string') {
          throw new Error('company must be a string when success=true');
        }

        if (!result.role || typeof result.role !== 'string') {
          throw new Error('role must be a string when success=true');
        }

        if (result.status && !['applied', 'interview', 'offer', 'rejected'].includes(result.status)) {
          throw new Error('status must be valid job status');
        }
      }

      if (!result.reasoning || typeof result.reasoning !== 'string') {
        throw new Error('reasoning must be a string');
      }

      return {
        success: result.success,
        company: result.company || '',
        role: result.role || '',
        status: result.status || 'applied',
        description: result.description || '',
        location: result.location || '',
        reasoning: result.reasoning
      };

    } catch (error) {
      console.error('Error parsing job extraction LLM response:', error);
      console.error('Raw response:', analysisText);
      
      return {
        success: false,
        company: '',
        role: '',
        status: 'applied',
        description: '',
        location: '',
        reasoning: `Failed to parse LLM response: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * Parse job matching result
   */
  parseJobMatchResult(analysisText) {
    try {
      const result = JSON.parse(analysisText);
      
      // Validate fields
      if (result.matched_job_id && typeof result.matched_job_id !== 'string') {
        throw new Error('matched_job_id must be string or null');
      }

      if (result.suggested_status && !['applied', 'interview', 'offer', 'rejected'].includes(result.suggested_status)) {
        throw new Error('suggested_status must be valid status or null');
      }

      if (!result.reasoning || typeof result.reasoning !== 'string') {
        throw new Error('reasoning must be a string');
      }

      return {
        matched_job_id: result.matched_job_id || null,
        suggested_status: result.suggested_status || null,
        reasoning: result.reasoning
      };

    } catch (error) {
      console.error('Error parsing job match LLM response:', error);
      console.error('Raw response:', analysisText);
      
      return {
        matched_job_id: null,
        suggested_status: null,
        reasoning: `Failed to parse LLM response: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * Update email tracking with analysis results (new schema)
   */
  async updateEmailAnalysis(emailTrackingId, analysis) {
    const updateData = {};

    // Add fields that are provided
    if (analysis.is_processed !== undefined) {
      updateData.is_processed = analysis.is_processed;
    }

    if (analysis.is_job_related !== undefined) {
      updateData.is_job_related = analysis.is_job_related;
    }

    // If matched to a specific job, set the association  
    if (analysis.job_id) {
      updateData.job_id = analysis.job_id;
    }

    // Set processed timestamp if marking as processed
    if (analysis.is_processed) {
      updateData.processed_at = new Date().toISOString();
    }

    console.log(`📝 Updating email analysis for ${emailTrackingId}:`, updateData);

    const { error } = await supabaseAdmin
      .from('email_tracking')
      .update(updateData)
      .eq('id', emailTrackingId);

    if (error) {
      console.error(`❌ Database update error:`, error);
      throw new Error(`Failed to update email analysis: ${error.message}`);
    }

    console.log(`✅ Email analysis updated successfully for ${emailTrackingId}`);
    return updateData;
  }

  /**
   * Clean email content for better LLM analysis
   */
  cleanEmailContent(rawText, rawHtml) {
    let cleanText = rawText || '';

    if (rawHtml && (!rawText || rawText.length < 100)) {
      // If no text version or very short, extract from HTML
      const cheerio = require('cheerio');
      const $ = cheerio.load(rawHtml);
      
      // Remove script and style elements
      $('script, style').remove();
      
      // Extract text content
      cleanText = $.text();
    }

    // Clean up the text
    cleanText = cleanText
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove email signatures (common patterns)
      .replace(/^--[\s\S]*$/m, '')
      .replace(/^\s*Sent from my.*/m, '')
      // Remove quoted text (basic pattern)
      .replace(/^>.*$/gm, '')
      // Remove confidentiality notices
      .replace(/This email.*confidential[\s\S]*$/i, '')
      .trim();

    return cleanText;
  }

  /**
   * Get analysis statistics for a user
   */
  async getAnalysisStats(userId) {
    const { data: stats, error } = await supabaseAdmin
      .from('email_tracking')
      .select('is_processed, is_job_related')
      .eq('user_id', userId)
      .eq('is_processed', true);

    if (error) {
      throw new Error(`Failed to get analysis stats: ${error.message}`);
    }

    const total = stats.length;
    const jobRelated = stats.filter(s => s.is_job_related).length;

    return {
      total_analyzed: total,
      job_related: jobRelated,
      not_job_related: total - jobRelated
    };
  }
}

module.exports = new LLMService();