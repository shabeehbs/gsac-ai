/*
  # Add Missing Foreign Key Indexes

  1. Performance Optimization
    - Add indexes on all foreign key columns that are missing them
    - This improves JOIN performance and query optimization
    - Prevents table scans when filtering by foreign keys

  2. Indexes Added
    - `ai_analysis_first_pass.created_by` - for user lookups
    - `ai_analysis_second_pass.first_pass_id` - for linking analysis passes
    - `ai_analysis_second_pass.human_review_id` - for review lookups
    - `human_reviews.analysis_id` - for finding reviews by analysis
    - `incident_documents.uploaded_by` - for user document lookups
    - `rca_reports.approved_by` - for approval tracking
    - `rca_reports.generated_by` - for generator tracking
    - `rca_reports.second_pass_id` - for linking to analysis

  3. Important Notes
    - These indexes significantly improve query performance at scale
    - Small storage overhead but massive performance gains
    - Critical for queries that JOIN or filter by these foreign keys
*/

-- Add index for ai_analysis_first_pass.created_by
CREATE INDEX IF NOT EXISTS idx_ai_analysis_first_pass_created_by 
ON ai_analysis_first_pass(created_by);

-- Add index for ai_analysis_second_pass.first_pass_id
CREATE INDEX IF NOT EXISTS idx_ai_analysis_second_pass_first_pass_id 
ON ai_analysis_second_pass(first_pass_id);

-- Add index for ai_analysis_second_pass.human_review_id
CREATE INDEX IF NOT EXISTS idx_ai_analysis_second_pass_human_review_id 
ON ai_analysis_second_pass(human_review_id);

-- Add index for human_reviews.analysis_id
CREATE INDEX IF NOT EXISTS idx_human_reviews_analysis_id 
ON human_reviews(analysis_id);

-- Add index for incident_documents.uploaded_by
CREATE INDEX IF NOT EXISTS idx_incident_documents_uploaded_by 
ON incident_documents(uploaded_by);

-- Add index for rca_reports.approved_by
CREATE INDEX IF NOT EXISTS idx_rca_reports_approved_by 
ON rca_reports(approved_by);

-- Add index for rca_reports.generated_by
CREATE INDEX IF NOT EXISTS idx_rca_reports_generated_by 
ON rca_reports(generated_by);

-- Add index for rca_reports.second_pass_id
CREATE INDEX IF NOT EXISTS idx_rca_reports_second_pass_id 
ON rca_reports(second_pass_id);
