export type AccountType = 'ADMIN' | 'BUYER';
export type SampleStatus = 'SCHEDULED' | 'ONGOING' | 'ENDED';
export type ApplicationStatus = 'APPLIED' | 'CANCELLED';

export type User = {
  id: string;
  account_type: AccountType;
  email: string;
  name: string;
  company_name: string | null;
  created_at: string;
};

export type Sample = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
  status: SampleStatus;
};

export type Application = {
  id: string;
  sample_id: string;
  user_id: string;
  status: ApplicationStatus;
  created_at: string;
};

export type ApplicationWithSample = Application & { sample: Sample };
export type ApplicationWithUser = Application & { user: User };
