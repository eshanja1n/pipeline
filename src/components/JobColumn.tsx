import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Job, JobStatus } from '../types/job';
import { JobCard } from './JobCard';

interface JobColumnProps {
  title: string;
  status: JobStatus;
  jobs: Job[];
  count: number;
}

const getColumnColor = (status: JobStatus) => {
  switch (status) {
    case 'applied':
      return 'border-blue-200 bg-blue-50/30';
    case 'interview':
      return 'border-yellow-200 bg-yellow-50/30';
    case 'offer':
      return 'border-green-200 bg-green-50/30';
    case 'rejected':
      return 'border-red-200 bg-red-50/30';
  }
};

const getHeaderColor = (status: JobStatus) => {
  switch (status) {
    case 'applied':
      return 'text-blue-700 bg-blue-100';
    case 'interview':
      return 'text-yellow-700 bg-yellow-100';
    case 'offer':
      return 'text-green-700 bg-green-100';
    case 'rejected':
      return 'text-red-700 bg-red-100';
  }
};

export const JobColumn: React.FC<JobColumnProps> = ({
  title,
  status,
  jobs,
  count
}) => {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div className={`flex-1 min-h-[600px] rounded-xl border-2 border-dashed ${getColumnColor(status)} p-4`}>
      <div className={`rounded-lg px-4 py-3 mb-4 ${getHeaderColor(status)}`}>
        <h2 className="text-lg font-semibold flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm font-medium bg-white/50 px-2 py-1 rounded-full">
            {count}
          </span>
        </h2>
      </div>
      
      <div
        ref={setNodeRef}
        className="space-y-3 min-h-[500px]"
      >
        <SortableContext
          items={jobs.map(job => job.id)}
          strategy={verticalListSortingStrategy}
        >
          {jobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </SortableContext>
        
        {jobs.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            No jobs in this column
          </div>
        )}
      </div>
    </div>
  );
};