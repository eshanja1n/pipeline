export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  appliedDate: string;
  status: 'applied' | 'interview' | 'offer' | 'rejected';
  salary?: string;
  description?: string;
  notes?: string;
}

export type JobStatus = 'applied' | 'interview' | 'offer' | 'rejected';