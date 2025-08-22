import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { LogOut, User, RefreshCw, Mail, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './ui/logo';
import { Job, JobStatus } from '../types/job';
import { JobColumn } from './JobColumn';
import { JobCard } from './JobCard';
import { useJobs } from '../hooks/useJobs';
import { apiClient } from '../lib/apiClient';
import { supabase } from '../lib/supabase';

const columnTitles: Record<JobStatus, string> = {
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

export const JobBoard: React.FC = () => {
  const { user, session, signOut } = useAuth();
  const { 
    jobs, 
    loading, 
    error, 
    refetch, 
    updateJobStatus 
  } = useJobs();
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [emailSyncEnabled, setEmailSyncEnabled] = useState(false);
  const [loadingUserProfile, setLoadingUserProfile] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load user profile on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      
      try {
        console.log('📋 Loading user profile...');
        const response = await apiClient.getUserProfile();
        console.log('✅ User profile loaded:', response.user);
        
        setEmailSyncEnabled(response.user.email_sync_enabled);
      } catch (error) {
        console.error('❌ Failed to load user profile:', error);
      } finally {
        setLoadingUserProfile(false);
      }
    };

    loadUserProfile();
  }, [user]);

  const handleToggleEmailSync = async () => {
    const newValue = !emailSyncEnabled;
    
    try {
      console.log(`🔄 Toggling email sync: ${emailSyncEnabled ? 'DISABLE' : 'ENABLE'}`);
      
      const response = await apiClient.updateEmailSyncPreference(newValue);
      console.log('✅ Email sync preference updated:', response);
      
      setEmailSyncEnabled(newValue);
      setSyncMessage(`Email sync ${newValue ? 'enabled' : 'disabled'} successfully`);
      
      // Clear message after 3 seconds
      setTimeout(() => setSyncMessage(null), 3000);
      
    } catch (error) {
      console.error('❌ Failed to update email sync preference:', error);
      setSyncMessage(`Failed to ${newValue ? 'enable' : 'disable'} email sync: ${error}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const job = jobs.find(j => j.id === active.id);
    setActiveJob(job || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveJob(null);
    
    if (!over) {
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeJob = jobs.find(job => job.id === activeId);
    if (!activeJob) return;

    // Check if we're dropping on a column (status) or another job card
    const overJob = jobs.find(job => job.id === overId);
    let newStatus: JobStatus;

    if (overJob) {
      // Dropping on another job card - use that job's status
      newStatus = overJob.status;
    } else {
      // Dropping on a column - use the column status
      newStatus = overId as JobStatus;
    }

    // Only update if the status is actually changing
    if (activeJob.status !== newStatus) {
      try {
        await updateJobStatus(activeJob.id, newStatus);
      } catch (error) {
        console.error('Failed to update job status:', error);
        // You could show a toast notification here
      }
    }
  };

  const handleDragOver = () => {
    // We'll handle all logic in handleDragEnd to avoid state conflicts
    return;
  };

  const getJobsByStatus = (status: JobStatus) => 
    jobs.filter(job => job.status === status);

  const refreshGoogleAccessToken = async (refreshToken: string): Promise<string | null> => {
    try {
      console.log('🔄 Calling Google OAuth2 token refresh...');
      
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.warn('⚠️ REACT_APP_GOOGLE_CLIENT_ID not configured');
        return null;
      }
      
      // Call Google's token endpoint to refresh the access token
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token refresh error response:', errorText);
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.access_token) {
        console.log('✅ Successfully refreshed Google access token');
        return data.access_token;
      } else {
        throw new Error('No access token in refresh response');
      }
    } catch (error) {
      console.error('❌ Failed to refresh Google access token:', error);
      return null;
    }
  };

  const getValidAccessToken = async () => {
    console.log('🔑 Getting valid Gmail access token...');
    
    if (!session) {
      throw new Error('No session found. Please sign in again.');
    }

    console.log('🔍 DEBUG: Full session object:', {
      session,
      sessionKeys: Object.keys(session),
      hasProviderToken: !!session.provider_token,
      hasProviderRefreshToken: !!session.provider_refresh_token,
      hasRefreshToken: !!session.refresh_token,
      expiresAt: session.expires_at,
      tokenExpiryTime: (session as any).provider_expires_at ? new Date((session as any).provider_expires_at * 1000).toISOString() : 'unknown'
    });

    // Check if we have a valid provider token that hasn't expired
    if (session.provider_token) {
      // Check if token is still valid (if we have expiry info)
      if ((session as any).provider_expires_at) {
        const now = Math.floor(Date.now() / 1000);
        const expiryTime = (session as any).provider_expires_at;
        const timeToExpiry = expiryTime - now;
        
        console.log(`🕐 Token expires in ${timeToExpiry} seconds`);
        
        // If token expires in more than 5 minutes, use it
        if (timeToExpiry > 300) {
          console.log('✅ Using existing valid provider token');
          return session.provider_token;
        }
        
        console.log('⚠️ Provider token will expire soon, attempting refresh...');
      } else {
        console.log('✅ Using existing provider token (no expiry info available)');
        return session.provider_token;
      }
    }

    // Try to refresh Google access token using refresh token
    if (session.provider_refresh_token) {
      console.log('🔄 Attempting to refresh Google access token using refresh token...');
      try {
        const refreshedToken = await refreshGoogleAccessToken(session.provider_refresh_token);
        if (refreshedToken) {
          console.log('✅ Successfully refreshed Google access token');
          return refreshedToken;
        }
      } catch (refreshError) {
        console.warn('⚠️ Failed to refresh Google access token:', refreshError);
      }
    }

    // Try Supabase session refresh as fallback
    console.log('🔄 Trying Supabase session refresh...');
    try {
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
      
      if (!error && newSession?.provider_token) {
        console.log('✅ Got fresh provider token from Supabase session refresh');
        return newSession.provider_token;
      }
    } catch (refreshError) {
      console.log('ℹ️ Supabase session refresh did not restore provider tokens');
    }

    // If we still have a current provider token, try using it as last resort
    if (session.provider_token) {
      console.log('🔑 Using existing provider token as last resort');
      return session.provider_token;
    }

    // Only redirect to re-auth if all refresh attempts failed
    console.log('❌ All token refresh attempts failed, but will not force re-authentication immediately');
    throw new Error('Gmail access token not available. Please check your connection or try again later.');
  };


  const handleSyncEmails = async () => {
    console.log('📋 Debug session info:', {
      hasSession: !!session,
      providerToken: !!session?.provider_token,
      providerRefreshToken: !!session?.provider_refresh_token,
      accessToken: !!session?.access_token,
      sessionKeys: session ? Object.keys(session) : [],
    });

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      console.log('🚀 Starting email sync from frontend...');
      
      // Get a valid access token (refresh if needed)
      const accessToken = await getValidAccessToken();
      
      const result = await apiClient.syncEmails(accessToken, {
        query: 'newer_than:7d', // Last 7 days
        maxResults: 50
      });

      console.log('✅ Email sync completed:', result);
      
      setSyncMessage(
        `Sync completed! Found ${result.totalFound} emails, processed ${result.processedCount} new emails${result.newJobsCreated > 0 ? `, created/updated ${result.newJobsCreated} jobs` : ''}.`
      );

      // Refresh jobs after sync in case new ones were created
      await refetch();

    } catch (error) {
      console.error('❌ Email sync failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide more helpful error messages
      if (errorMessage.includes('Redirecting for authentication')) {
        setSyncMessage('Refreshing Gmail access... Please wait.');
        // Clear the message since we're redirecting
        setTimeout(() => setSyncMessage(null), 2000);
      } else if (errorMessage.includes('sign in again')) {
        setSyncMessage('Gmail access issue. Try syncing again or refresh the page.');
      } else {
        setSyncMessage(`Sync failed: ${errorMessage}`);
      }
    } finally {
      setIsSyncing(false);
      
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Logo size="md" className="filter-green-only" />
                <h1 className="text-4xl font-bold text-gray-900">
                  pipeline
                </h1>
              </div>
              <p className="text-gray-600 text-lg">
                Track your job applications and their progress through different stages
              </p>
              <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
                <span>Total Applications: {jobs.length}</span>
                <span>•</span>
                <span>Active: {jobs.filter(j => j.status !== 'rejected').length}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Email Sync Toggle */}
              <div className="flex items-center space-x-3 px-3 py-2 border border-gray-300 rounded-md bg-white">
                <Settings size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Email Sync:
                </span>
                <button
                  onClick={handleToggleEmailSync}
                  disabled={loadingUserProfile}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                    emailSyncEnabled ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm ${emailSyncEnabled ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                  {loadingUserProfile ? 'Loading...' : emailSyncEnabled ? 'ON' : 'OFF'}
                </span>
              </div>

              {/* Sync Emails Button - only show if email sync is enabled */}
              {emailSyncEnabled && (
                <button
                  onClick={handleSyncEmails}
                  disabled={isSyncing || loading}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Mail size={16} className={`mr-2 ${isSyncing ? 'animate-pulse' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Emails'}
                </button>
              )}
              <div className="flex items-center space-x-3 text-gray-700">
                <User size={20} />
                <div className="text-right">
                  <div className="font-medium">{user?.user_metadata?.full_name || user?.email}</div>
                  <div className="text-sm text-gray-500">{user?.email}</div>
                </div>
              </div>
              <button
                onClick={signOut}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <LogOut size={16} className="mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p className="text-sm">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {syncMessage && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
            <p className="text-sm">
              <strong>Email Sync:</strong> {syncMessage}
            </p>
          </div>
        )}

        {loading && jobs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Loading your job applications...</p>
            </div>
          </div>
        ) : (
          <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {(Object.keys(columnTitles) as JobStatus[]).map(status => (
              <JobColumn
                key={status}
                title={columnTitles[status]}
                status={status}
                jobs={getJobsByStatus(status)}
                count={getJobsByStatus(status).length}
              />
            ))}
          </div>

            <DragOverlay>
              {activeJob ? <JobCard job={activeJob} /> : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Footer */}
        <footer className="mt-16 py-8 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <Link
                to="/privacy"
                className="hover:text-gray-700 underline cursor-pointer"
              >
                Privacy Policy
              </Link>
              <span>•</span>
              <Link
                to="/terms"
                className="hover:text-gray-700 underline cursor-pointer"
              >
                Terms of Service
              </Link>
              <span>•</span>
              <span>© {new Date().getFullYear()} Pipeline</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};