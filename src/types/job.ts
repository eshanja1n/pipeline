export interface Job {
  id: string;
  title: string;
  company: string;
  appliedDate: string;
  status: 'applied' | 'interview' | 'offer' | 'rejected';
}

export type JobStatus = 'applied' | 'interview' | 'offer' | 'rejected';