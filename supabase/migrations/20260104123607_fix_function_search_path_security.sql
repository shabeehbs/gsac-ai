/*
  # Fix Function Search Path Security Issue

  1. Security Enhancement
    - Recreate `update_updated_at_column` function with secure search_path
    - Set search_path to empty string to prevent injection attacks
    - Use fully qualified table names for security

  2. Changes
    - Drop and recreate function with proper security settings
    - Add SECURITY DEFINER with restricted search_path
    - Prevents potential search_path injection vulnerabilities

  3. Important Notes
    - This is a best practice for trigger functions
    - Prevents malicious users from manipulating search_path
    - No functional changes, only security improvements
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Recreate with secure search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers for tables that need updated_at
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rca_reports_updated_at
  BEFORE UPDATE ON public.rca_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
