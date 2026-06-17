export type InstitutionType = 'Synagogue' | 'Chabad' | 'School' | 'JCC' | 'Opportunity';
export type EducationActivity = 'yes' | 'no' | 'unknown';
export type ActivityLevel = 'high' | 'medium' | 'low' | 'none';
export type InstitutionStatus = 'Active' | 'Inactive' | 'Needs Action' | 'Follow Up' | 'Prospect';

export interface Institution {
  id: string | number;
  name: string;
  type: string;
  city: string;
  state_province: string;
  country: string;
  latitude: number;
  longitude: number;
  website_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  education_activity: string;
  activity_level: string;
  opportunity_score: number;
  status: string;
  next_action?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Filters {
  type: string;
  education_activity: string;
  min_opportunity_score: number;
  status: string;
}

export interface Stats {
  total: number;
  visible: number;
  highOpportunity: number;
  needsAction: number;
}

// Placeholder interfaces for future tables
export interface Signal {
  id: string;
  institution_id: string;
  type: string;
  content: string;
  source: string;
  detected_at: string;
  created_at: string;
}

export interface Case {
  id: string;
  institution_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export const MARKER_COLORS: Record<string, string> = {
  Synagogue: '#3B82F6',
  Chabad: '#F59E0B',
  School: '#22C55E',
  JCC: '#8B5CF6',
  Opportunity: '#EF4444',
  default: '#94A3B8',
};

export const INSTITUTION_TYPES: InstitutionType[] = [
  'Synagogue',
  'Chabad',
  'School',
  'JCC',
  'Opportunity',
];

export const EDUCATION_ACTIVITIES: EducationActivity[] = ['yes', 'no', 'unknown'];

export const INSTITUTION_STATUSES: InstitutionStatus[] = [
  'Active',
  'Inactive',
  'Needs Action',
  'Follow Up',
  'Prospect',
];
