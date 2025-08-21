import { supabase } from './supabase';

// Production-only API configuration - always use Vercel Functions
const getApiBaseUrl = () => {
  console.log('🚀 PIPELINE API CLIENT - PRODUCTION ONLY:', {
    hostname: window.location.hostname,
    buildTime: new Date().toISOString(),
    apiURL: '/api'
  });
  
  // Always use Vercel Functions at /api
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      // First try to get the current session
      let { data: { session }, error } = await supabase.auth.getSession();
      
      console.log('🔍 DEBUG: Current session state:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        hasRefreshToken: !!session?.refresh_token,
        expiresAt: session?.expires_at,
        timeLeft: session?.expires_at ? Math.floor((session.expires_at - Date.now() / 1000) / 60) + ' minutes' : 'N/A',
        error: error?.message
      });
      
      if (error) {
        throw new Error(`Session error: ${error.message}`);
      }
      
      // If no session or token is expired/close to expiring, try to refresh
      if (!session?.access_token || this.isTokenExpiringSoon(session)) {
        console.log('🔄 Session expired or expiring soon, attempting refresh...');
        console.log('🔍 DEBUG: Refresh attempt details:', {
          hasRefreshToken: !!session?.refresh_token,
          isExpiringSoon: session ? this.isTokenExpiringSoon(session) : 'no session'
        });
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        console.log('🔍 DEBUG: Refresh result:', {
          success: !refreshError,
          hasNewSession: !!refreshData?.session,
          hasNewAccessToken: !!refreshData?.session?.access_token,
          hasNewRefreshToken: !!refreshData?.session?.refresh_token,
          error: refreshError?.message
        });
        
        if (refreshError) {
          console.error('❌ Failed to refresh session:', refreshError);
          throw new Error('Session expired. Please refresh the page and sign in again.');
        }
        
        if (refreshData.session) {
          session = refreshData.session;
          console.log('✅ Session refreshed successfully');
        } else {
          throw new Error('Refresh succeeded but no new session returned');
        }
      }
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };
    } catch (error) {
      console.error('❌ ApiClient: Error in getAuthHeaders:', error);
      throw error;
    }
  }

  private isTokenExpiringSoon(session: any): boolean {
    if (!session.expires_at) return false;
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    const timeUntilExpiry = expiresAt - now;
    
    // Refresh if expires in less than 5 minutes (300 seconds)
    return timeUntilExpiry < 300;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('❌ ApiClient: Fetch error:', error);
      throw error;
    }
  }

  // Job API methods
  async getJobs(params?: { status?: string; limit?: number; offset?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    
    const query = searchParams.toString();
    const endpoint = `/jobs${query ? `?${query}` : ''}`;
    
    return this.request<{ jobs: any[]; pagination: any }>(endpoint);
  }

  async getJob(id: string) {
    return this.request<{ job: any }>(`/jobs/${id}`);
  }

  async createJob(jobData: any) {
    return this.request<{ job: any }>('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  }

  async updateJob(id: string, jobData: any) {
    return this.request<{ job: any }>(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(jobData),
    });
  }

  async deleteJob(id: string) {
    return this.request(`/jobs/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkUpdateJobs(updates: Array<{ id: string; status: string }>) {
    return this.request<{ results: any[] }>('/jobs/bulk-update', {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    });
  }

  // Email API methods
  async getEmailTracking(params?: { 
    limit?: number; 
    offset?: number; 
    is_job_related?: boolean; 
    is_processed?: boolean; 
  }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.is_job_related !== undefined) searchParams.append('is_job_related', params.is_job_related.toString());
    if (params?.is_processed !== undefined) searchParams.append('is_processed', params.is_processed.toString());
    
    const query = searchParams.toString();
    return this.request<{ emails: any[]; pagination: any }>(`/emails/tracking${query ? `?${query}` : ''}`);
  }

  async getEmailContent(trackingId: string) {
    return this.request<{ content: any }>(`/emails/content/${trackingId}`);
  }

  async syncEmails(accessToken: string, options?: any) {
    return this.request<any>('/emails/sync', {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken, options }),
    });
  }

  async processEmails(emailIds: string[]) {
    return this.request<any>('/emails/process', {
      method: 'POST',
      body: JSON.stringify({ email_ids: emailIds }),
    });
  }

  async getEmailStats() {
    return this.request<{ statistics: any }>('/emails/stats');
  }

  // Queue API methods
  async getQueueStats() {
    return this.request<{ stats: any }>('/queue/stats');
  }

  async getJobStatus(jobId: string, type: 'sync' | 'analysis' = 'sync') {
    return this.request<{ job: any }>(`/queue/job/${jobId}?type=${type}`);
  }

  async cancelJob(jobId: string, type: 'sync' | 'analysis' = 'sync') {
    return this.request<any>(`/queue/job/${jobId}?type=${type}`, {
      method: 'DELETE',
    });
  }

  async queueEmailSync(accessToken: string, options?: any) {
    return this.request<any>('/queue/sync', {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken, options }),
    });
  }

  async queueEmailAnalysis(emailIds: string[]) {
    return this.request<any>('/queue/analyze', {
      method: 'POST',
      body: JSON.stringify({ email_ids: emailIds }),
    });
  }

  async getQueueHealth() {
    return this.request<any>('/queue/health');
  }

  // User API methods
  async ensureUserExists(email: string, name: string) {
    return this.request<{ success: boolean; user: any }>('/users/ensure-exists', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });
  }

  async getUserProfile() {
    return this.request<{ success: boolean; user: any }>('/users/profile');
  }

  async updateEmailSyncPreference(enabled: boolean) {
    return this.request<{ success: boolean; user: any }>('/users/email-sync-preference', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  }

  // Auth API methods
  async verifyToken() {
    return this.request<{ user: any }>('/auth/verify');
  }

  async refreshToken(refreshToken: string) {
    return this.request<any>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async signOut() {
    return this.request<any>('/auth/signout', {
      method: 'POST',
    });
  }

  async getProfile() {
    return this.request<{ user: any }>('/auth/profile');
  }

  // Health check (no auth required)
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
  }
}

export const apiClient = new ApiClient();