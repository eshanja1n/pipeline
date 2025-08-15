import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './ui/logo';
import { Job, JobStatus } from '../types/job';
import { JobColumn } from './JobColumn';
import { JobCard } from './JobCard';
import { sampleJobs } from '../data/sampleJobs';

const columnTitles: Record<JobStatus, string> = {
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

export const JobBoard: React.FC = () => {
  const { user, signOut } = useAuth();
  const [jobs, setJobs] = useState<Job[]>(sampleJobs);
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const job = jobs.find(j => j.id === active.id);
    setActiveJob(job || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
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
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === activeId
            ? { ...job, status: newStatus }
            : job
        )
      );
    }
  };

  const handleDragOver = () => {
    // We'll handle all logic in handleDragEnd to avoid state conflicts
    return;
  };

  const getJobsByStatus = (status: JobStatus) => 
    jobs.filter(job => job.status === status);

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
      </div>
    </div>
  );
};