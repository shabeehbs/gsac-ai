/*
  # Optimize RLS Policies for Performance

  1. Performance Optimization
    - Replace direct `auth.uid()` calls with `(select auth.uid())`
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Tables Updated
    - `incidents` - 3 policies optimized
    - `incident_documents` - 2 policies optimized
    - `ai_analysis_first_pass` - 2 policies optimized
    - `human_reviews` - 3 policies optimized
    - `ai_analysis_second_pass` - 2 policies optimized
    - `rca_reports` - 3 policies optimized
    - `audit_logs` - 1 policy optimized

  3. Important Notes
    - Wrapped auth functions are evaluated once per query, not per row
    - Maintains same security while improving performance
    - Critical for tables with many rows
*/

-- Optimize incidents policies
DROP POLICY IF EXISTS "Users can view incidents they reported or are assigned to" ON incidents;
CREATE POLICY "Users can view incidents they reported or are assigned to"
  ON incidents FOR SELECT
  TO authenticated
  USING (
    reported_by = (select auth.uid()) OR 
    assigned_investigator = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can create incidents" ON incidents;
CREATE POLICY "Users can create incidents"
  ON incidents FOR INSERT
  TO authenticated
  WITH CHECK (reported_by = (select auth.uid()));

DROP POLICY IF EXISTS "Assigned investigators can update incidents" ON incidents;
CREATE POLICY "Assigned investigators can update incidents"
  ON incidents FOR UPDATE
  TO authenticated
  USING (assigned_investigator = (select auth.uid()))
  WITH CHECK (assigned_investigator = (select auth.uid()));

-- Optimize incident_documents policies
DROP POLICY IF EXISTS "Users can view documents for accessible incidents" ON incident_documents;
CREATE POLICY "Users can view documents for accessible incidents"
  ON incident_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM incidents
      WHERE incidents.id = incident_documents.incident_id
      AND (incidents.reported_by = (select auth.uid()) OR incidents.assigned_investigator = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can upload documents to accessible incidents" ON incident_documents;
CREATE POLICY "Users can upload documents to accessible incidents"
  ON incident_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM incidents
      WHERE incidents.id = incident_documents.incident_id
      AND (incidents.reported_by = (select auth.uid()) OR incidents.assigned_investigator = (select auth.uid()))
    )
  );

-- Optimize ai_analysis_first_pass policies
DROP POLICY IF EXISTS "Users can view AI analysis for accessible incidents" ON ai_analysis_first_pass;
CREATE POLICY "Users can view AI analysis for accessible incidents"
  ON ai_analysis_first_pass FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM incidents
      WHERE incidents.id = ai_analysis_first_pass.incident_id
      AND (incidents.reported_by = (select auth.uid()) OR incidents.assigned_investigator = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can create AI analysis for accessible incidents" ON ai_analysis_first_pass;
CREATE POLICY "Users can create AI analysis for accessible incidents"
  ON ai_analysis_first_pass FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM incidents
      WHERE incidents.id = ai_analysis_first_pass.incident_id
      AND (incidents.reported_by = (select auth.uid()) OR incidents.assigned_investigator = (select auth.uid()))
    )
  );

-- Optimize human_reviews policies
DROP POLICY IF EXISTS "Users can view reviews for accessible incidents" ON human_reviews;
CREATE POLICY "Users can view reviews for accessible incidents"
  ON human_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM incidents
      WHERE incidents.id = human_reviews.incident_id
      AND (incidents.reported_by = (select auth.uid()) OR incidents.assigned_investigator = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Assigned investigators can create reviews" ON human_reviews;
CREATE POLICY "Assigned investigators can create reviews"
  ON human_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM incidents
      WHERE incidents.id = human_reviews.incident_id
      AND incidents.assigned_investigator = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Reviewers can update their own reviews" ON human_reviews;
CREATE POLICY "Reviewers can update their own reviews"
  ON human_reviews FOR UPDATE
  TO authenticated
  USING (reviewer_id = (select auth.uid()))
  WITH CHECK (reviewer_id = (select auth.uid()));

-- Optimize ai_analysis_second_pass policies
DROP POLICY IF EXISTS "Users can view second pass analysis for accessible incidents" ON ai_analysis_second_pass;
CREATE POLICY "Users can view second pass analysis for accessible incidents"
  ON ai_analysis_second_pass FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM incidents
      WHERE incidents.id = ai_analysis_second_pass.incident_id
      AND (incidents.reported_by = (select auth.uid()) OR incidents.assigned_investigator = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "System can create second pass analysis" ON ai_analysis_second_pass;
CREATE POLICY "System can create second pass analysis"
  ON ai_analysis_second_pass FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM incidents
      WHERE incidents.id = ai_analysis_second_pass.incident_id
      AND (incidents.reported_by = (select auth.uid()) OR incidents.assigned_investigator = (select auth.uid()))
    )
  );

-- Optimize rca_reports policies
DROP POLICY IF EXISTS "Users can view RCA reports for accessible incidents" ON rca_reports;
CREATE POLICY "Users can view RCA reports for accessible incidents"
  ON rca_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM incidents
      WHERE incidents.id = rca_reports.incident_id
      AND (incidents.reported_by = (select auth.uid()) OR incidents.assigned_investigator = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Investigators can create RCA reports" ON rca_reports;
CREATE POLICY "Investigators can create RCA reports"
  ON rca_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM incidents
      WHERE incidents.id = rca_reports.incident_id
      AND incidents.assigned_investigator = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Investigators can update RCA reports" ON rca_reports;
CREATE POLICY "Investigators can update RCA reports"
  ON rca_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM incidents
      WHERE incidents.id = rca_reports.incident_id
      AND incidents.assigned_investigator = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM incidents
      WHERE incidents.id = rca_reports.incident_id
      AND incidents.assigned_investigator = (select auth.uid())
    )
  );

-- Optimize audit_logs policy
DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;
CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = (select auth.uid()));
