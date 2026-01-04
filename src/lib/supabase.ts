import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Incident = {
  id: string;
  incident_number: string;
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'serious' | 'critical';
  incident_type: 'injury' | 'near_miss' | 'property_damage' | 'environmental' | 'process_safety';
  incident_date: string;
  location: string;
  reported_by: string;
  assigned_investigator: string | null;
  status: 'draft' | 'reported' | 'under_investigation' | 'pending_review' | 'closed';
  created_at: string;
  updated_at: string;
};

export type IncidentDocument = {
  id: string;
  incident_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  ocr_text: string | null;
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
  ai_description: string | null;
  uploaded_by: string;
  created_at: string;
};

export type AIAnalysisFirstPass = {
  id: string;
  incident_id: string;
  analysis_data: any;
  identified_hazards: string[];
  potential_causes: string[];
  recommended_actions: string[];
  confidence_score: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  created_by: string;
};

export type HumanReview = {
  id: string;
  incident_id: string;
  analysis_id: string;
  reviewer_id: string;
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  reviewer_notes: string | null;
  corrections: any;
  approved_hazards: string[];
  approved_causes: string[];
  additional_actions: string[];
  reviewed_at: string | null;
  created_at: string;
};

export type CorrectiveAction = {
  action: string;
  responsibility?: string;
  timeline?: string;
  priority?: 'high' | 'medium' | 'low';
};

export type PreventiveAction = {
  action: string;
  responsibility?: string;
  timeline?: string;
  priority?: 'high' | 'medium' | 'low';
};

export type AIAnalysisSecondPass = {
  id: string;
  incident_id: string;
  first_pass_id: string;
  human_review_id: string;
  refined_analysis: any;
  root_cause_analysis: any;
  contributing_factors: string[];
  immediate_causes: string[];
  root_causes: string[];
  corrective_actions: (string | CorrectiveAction)[];
  preventive_actions: (string | PreventiveAction)[];
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
};

export type RCAReport = {
  id: string;
  incident_id: string;
  report_number: string;
  second_pass_id: string | null;
  executive_summary: string | null;
  incident_details: any;
  investigation_findings: any;
  root_cause_tree: any;
  recommendations: any;
  compliance_references: string[];
  report_status: 'draft' | 'under_review' | 'approved' | 'published';
  generated_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  incident_id: string | null;
  action_type: string;
  action_details: any;
  entity_type: string;
  entity_id: string | null;
  performed_by: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};
