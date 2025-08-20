import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MagicCard } from './ui/magic-card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Job } from '../types/job';
import { Calendar } from 'lucide-react';

interface JobCardProps {
  job: Job;
}

export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: job.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };


  const getGradientColor = (status: string) => {
    switch (status) {
      case 'applied':
        return '#3b82f6'; // blue
      case 'interview':
        return '#eab308'; // yellow
      case 'offer':
        return '#22c55e'; // green
      case 'rejected':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-move"
    >
      <MagicCard 
        className="w-full transition-all duration-300"
        gradientColor={getGradientColor(job.status)}
        gradientSize={150}
        gradientOpacity={0.15}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-gray-100 text-gray-600 font-semibold">
              {job.company.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 leading-tight truncate">
              {job.title}
            </h3>
            <div className="text-base font-medium text-gray-800 truncate">
              {job.company}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="flex items-center text-sm text-gray-600 gap-1">
            <Calendar size={14} />
            <span>Applied: {new Date(job.appliedDate).toLocaleDateString()}</span>
          </div>
        </div>
      </MagicCard>
    </div>
  );
};