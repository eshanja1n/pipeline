import React, { useState, useEffect } from 'react';
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

  const getValidAccessToken = async () => {
    console.log('🔑 Getting valid Gmail access token...');
    
    if (!session) {
      throw new Error('No session found. Please sign in again.');
    }

    console.log('🔍 DEBUG: Provider token state:', {
      hasProviderToken: !!session.provider_token,
      hasProviderRefreshToken: !!session.provider_refresh_token,
      hasRefreshToken: !!session.refresh_token,
      expiresAt: session.expires_at
    });

    // Try to refresh the session first to get fresh provider tokens
    console.log('🔄 Refreshing session to get fresh provider tokens...');
    try {
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
      
      console.log('🔍 DEBUG: Session refresh result:', {
        success: !error,
        hasNewSession: !!newSession,
        hasNewProviderToken: !!newSession?.provider_token,
        error: error?.message
      });
      
      if (error) {
        console.error('❌ Failed to refresh session:', error);
        throw new Error('Session expired. Please refresh the page and sign in again.');
      }
      
      if (newSession?.provider_token) {
        console.log('✅ Got fresh provider token from session refresh');
        return newSession.provider_token;
      }
    } catch (refreshError) {
      console.error('❌ Session refresh failed:', refreshError);
    }

    // Fallback: check if current provider token is still valid
    if (session.provider_token) {
      console.log('🔑 Trying existing provider token as fallback');
      return session.provider_token;
    }

    throw new Error('No Gmail access token found. Please refresh the page and sign in again.');
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
        `Sync completed! Found ${result.totalFound} emails, processed ${result.processedCount} new emails.`
      );

      // Refresh jobs after sync in case new ones were created
      await refetch();

    } catch (error) {
      console.error('❌ Email sync failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide more helpful error messages
      if (errorMessage.includes('sign in again')) {
        setSyncMessage('Session expired. Please refresh the page and sign in again.');
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
      </div>
    </div>
  );
};