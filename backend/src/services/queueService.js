const Queue = require('bull');
const gmailService = require('./gmailService');
const llmService = require('./llmService');

class QueueService {
  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    console.log(`🔄 Initializing queue service with Redis URL: ${redisUrl}`);
    
    try {
      // Create job queues
      this.emailSyncQueue = new Queue('email sync', redisUrl);
      this.emailAnalysisQueue = new Queue('email analysis', redisUrl);

      // Set up job processors
      this.setupProcessors();
      
      // Set up error handling
      this.setupErrorHandling();
      
      console.log(`✅ Queue service initialized successfully`);
    } catch (error) {
      console.error(`❌ Failed to initialize queue service:`, error);
      console.log(`⚠️ Queue operations will be bypassed`);
      this.queueDisabled = true;
    }
  }

  /**
   * Set up queue processors
   */
  setupProcessors() {
    // Email sync processor
    this.emailSyncQueue.process('sync-user-emails', async (job) => {
      const { userId, accessToken, options } = job.data;
      
      try {
        console.log(`Processing email sync for user ${userId}`);
        const result = await gmailService.syncUserEmails(userId, accessToken, options);
        
        // Auto-queue newly synced emails for analysis
        if (result.newEmails && result.newEmails.length > 0) {
          console.log(`📨 Processing ${result.newEmails.length} new emails for LLM analysis`);
          console.log(`   New emails structure:`, result.newEmails.map(e => ({ id: e.id, gmail_id: e.gmail_message_id, subject: e.subject })));
          
          // Use the tracking record IDs (not Gmail message IDs)
          const trackingIds = result.newEmails.map(e => e.id);
          console.log(`   Tracking IDs for analysis: ${trackingIds.join(', ')}`);
          
          if (this.queueDisabled) {
            console.log(`⚠️ Queue disabled, processing emails directly...`);
            // Process directly without queue
            try {
              const analysisResult = await llmService.analyzeEmailBatch(trackingIds, userId);
              console.log(`✅ Direct analysis completed:`, analysisResult);
            } catch (error) {
              console.error(`❌ Direct analysis failed:`, error);
            }
          } else {
            await this.queueEmailAnalysis(userId, trackingIds);
          }
        } else {
          console.log(`📭 No new emails found for analysis`);
        }
        
        return result;
      } catch (error) {
        console.error(`Email sync failed for user ${userId}:`, error);
        throw error;
      }
    });

    // Email analysis processor
    this.emailAnalysisQueue.process('analyze-emails', async (job) => {
      const { userId, emailIds } = job.data;
      
      try {
        console.log(`🤖 Processing email analysis for user ${userId}, ${emailIds.length} emails`);
        console.log(`   Analyzing email IDs: ${emailIds.join(', ')}`);
        const result = await llmService.analyzeEmailBatch(emailIds, userId);
        console.log(`✅ Email analysis completed for user ${userId}`);
        return result;
      } catch (error) {
        console.error(`❌ Email analysis failed for user ${userId}:`, error);
        throw error;
      }
    });
  }

  /**
   * Set up error handling for queues
   */
  setupErrorHandling() {
    this.emailSyncQueue.on('failed', (job, err) => {
      console.error(`Email sync job ${job.id} failed:`, err);
    });

    this.emailAnalysisQueue.on('failed', (job, err) => {
      console.error(`Email analysis job ${job.id} failed:`, err);
    });

    this.emailSyncQueue.on('completed', (job) => {
      console.log(`Email sync job ${job.id} completed`);
    });

    this.emailAnalysisQueue.on('completed', (job) => {
      console.log(`Email analysis job ${job.id} completed`);
    });
  }

  /**
   * Queue email sync for a user
   */
  async queueEmailSync(userId, accessToken, options = {}) {
    const jobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 10,
      removeOnFail: 5
    };

    const job = await this.emailSyncQueue.add('sync-user-emails', {
      userId,
      accessToken,
      options
    }, jobOptions);

    return {
      jobId: job.id,
      status: 'queued'
    };
  }

  /**
   * Queue email analysis for specific emails
   */
  async queueEmailAnalysis(userId, emailIds) {
    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return { message: 'No emails to analyze' };
    }

    if (this.queueDisabled) {
      console.log(`⚠️ Queue disabled, cannot queue email analysis`);
      return { message: 'Queue system disabled' };
    }

    // Split large batches into smaller chunks
    const chunkSize = 5;
    const chunks = [];
    for (let i = 0; i < emailIds.length; i += chunkSize) {
      chunks.push(emailIds.slice(i, i + chunkSize));
    }

    const jobOptions = {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: 10,
      removeOnFail: 5
    };

    const jobs = [];
    for (const chunk of chunks) {
      const job = await this.emailAnalysisQueue.add('analyze-emails', {
        userId,
        emailIds: chunk
      }, jobOptions);
      
      jobs.push({
        jobId: job.id,
        emailCount: chunk.length
      });
    }

    return {
      totalJobs: jobs.length,
      totalEmails: emailIds.length,
      jobs
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [syncStats, analysisStats] = await Promise.all([
      this.getQueueStatistics(this.emailSyncQueue),
      this.getQueueStatistics(this.emailAnalysisQueue)
    ]);

    return {
      email_sync: syncStats,
      email_analysis: analysisStats
    };
  }

  /**
   * Get statistics for a specific queue
   */
  async getQueueStatistics(queue) {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId, queueType = 'sync') {
    try {
      const queue = queueType === 'sync' ? this.emailSyncQueue : this.emailAnalysisQueue;
      const job = await queue.getJob(jobId);
      
      if (!job) {
        return { status: 'not_found' };
      }

      return {
        id: job.id,
        status: await job.getState(),
        progress: job.progress(),
        data: job.data,
        returnValue: job.returnvalue,
        failedReason: job.failedReason,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn
      };
    } catch (error) {
      console.error('Error getting job status:', error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId, queueType = 'sync') {
    try {
      const queue = queueType === 'sync' ? this.emailSyncQueue : this.emailAnalysisQueue;
      const job = await queue.getJob(jobId);
      
      if (job) {
        await job.remove();
        return { success: true, message: 'Job cancelled' };
      }
      
      return { success: false, message: 'Job not found' };
    } catch (error) {
      console.error('Error cancelling job:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanupJobs() {
    try {
      await Promise.all([
        this.emailSyncQueue.clean(24 * 60 * 60 * 1000, 'completed'), // Remove completed jobs older than 24h
        this.emailSyncQueue.clean(24 * 60 * 60 * 1000, 'failed'),    // Remove failed jobs older than 24h
        this.emailAnalysisQueue.clean(24 * 60 * 60 * 1000, 'completed'),
        this.emailAnalysisQueue.clean(24 * 60 * 60 * 1000, 'failed')
      ]);
      
      console.log('Queue cleanup completed');
    } catch (error) {
      console.error('Error during queue cleanup:', error);
    }
  }

  /**
   * Pause all queues
   */
  async pauseQueues() {
    await Promise.all([
      this.emailSyncQueue.pause(),
      this.emailAnalysisQueue.pause()
    ]);
  }

  /**
   * Resume all queues
   */
  async resumeQueues() {
    await Promise.all([
      this.emailSyncQueue.resume(),
      this.emailAnalysisQueue.resume()
    ]);
  }

  /**
   * Get queue health status
   */
  async getHealth() {
    try {
      const stats = await this.getQueueStats();
      const isHealthy = Object.values(stats).every(queueStats => 
        queueStats.failed < 10 && queueStats.active < 100
      );

      return {
        healthy: isHealthy,
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
module.exports = new QueueService();