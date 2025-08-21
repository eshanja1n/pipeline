import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';
import { Job } from '../types/job';
import { useAuth } from '../contexts/AuthContext';

interface UseJobsReturn {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createJob: (jobData: Omit<Job, 'id' | 'created_at' | 'updated_at'>) => Promise<Job>;
  updateJob: (id: string, jobData: Partial<Job>) => Promise<Job>;
  deleteJob: (id: string) => Promise<void>;
  updateJobStatus: (id: string, status: Job['status']) => Promise<Job>;
  bulkUpdateStatuses: (updates: Array<{ id: string; status: Job['status'] }>) => Promise<void>;
}

export const useJobs = (): UseJobsReturn => {
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getJobs();
      setJobs(response.jobs || []);
    } catch (err) {
      console.error('❌ useJobs: Error fetching jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  const createJob = useCallback(async (jobData: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> => {
    try {
      const response = await apiClient.createJob(jobData);
      const newJob = response.job;
      setJobs(prev => [newJob, ...prev]);
      return newJob;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create job';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateJob = useCallback(async (id: string, jobData: Partial<Job>): Promise<Job> => {
    try {
      const response = await apiClient.updateJob(id, jobData);
      const updatedJob = response.job;
      setJobs(prev => prev.map(job => job.id === id ? updatedJob : job));
      return updatedJob;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update job';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteJob = useCallback(async (id: string): Promise<void> => {
    try {
      await apiClient.deleteJob(id);
      setJobs(prev => prev.filter(job => job.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete job';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateJobStatus = useCallback(async (id: string, status: Job['status']): Promise<Job> => {
    return updateJob(id, { status });
  }, [updateJob]);

  const bulkUpdateStatuses = useCallback(async (updates: Array<{ id: string; status: Job['status'] }>): Promise<void> => {
    try {
      const response = await apiClient.bulkUpdateJobs(updates);
      
      // Update local state with successful updates
      const successfulUpdates = response.results.filter(result => result.success);
      setJobs(prev => prev.map(job => {
        const update = successfulUpdates.find(u => u.job?.id === job.id);
        return update ? update.job : job;
      }));

      // Handle any failed updates
      const failedUpdates = response.results.filter(result => !result.success);
      if (failedUpdates.length > 0) {
        console.warn('Some updates failed:', failedUpdates);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk update jobs';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    // Only fetch jobs when auth is ready and user is logged in
    if (!authLoading && user) {
      fetchJobs();
    } else if (!authLoading && !user) {
      // If auth is ready but no user, stop loading
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  return {
    jobs,
    loading,
    error,
    refetch,
    createJob,
    updateJob,
    deleteJob,
    updateJobStatus,
    bulkUpdateStatuses,
  };
};