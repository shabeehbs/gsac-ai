import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateReportRequest {
  secondPassId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { secondPassId }: GenerateReportRequest = await req.json();

    if (!secondPassId) {
      return new Response(
        JSON.stringify({ error: "secondPassId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: secondPass, error: secondPassError } = await supabaseClient
      .from("ai_analysis_second_pass")
      .select("*")
      .eq("id", secondPassId)
      .single();

    if (secondPassError || !secondPass) {
      return new Response(
        JSON.stringify({ error: "Second pass analysis not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: incident } = await supabaseClient
      .from("incidents")
      .select("*")
      .eq("id", secondPass.incident_id)
      .single();

    const { data: firstPass } = await supabaseClient
      .from("ai_analysis_first_pass")
      .select("*")
      .eq("id", secondPass.first_pass_id)
      .single();

    const { data: review } = await supabaseClient
      .from("human_reviews")
      .select("*")
      .eq("id", secondPass.human_review_id)
      .single();

    const { data: existingReport } = await supabaseClient
      .from("rca_reports")
      .select("*")
      .eq("incident_id", incident.id)
      .maybeSingle();

    const reportContent = await generateFormalRCAReport(
      incident,
      secondPass,
      firstPass,
      review
    );

    let reportId: string;

    if (existingReport) {
      const { data: updatedReport } = await supabaseClient
        .from("rca_reports")
        .update({
          second_pass_id: secondPassId,
          executive_summary: reportContent.executiveSummary,
          incident_details: reportContent.incidentDetails,
          investigation_findings: reportContent.investigationFindings,
          root_cause_tree: reportContent.rootCauseTree,
          recommendations: reportContent.recommendations,
          compliance_references: reportContent.complianceReferences,
          report_status: "draft",
        })
        .eq("id", existingReport.id)
        .select()
        .single();
      reportId = updatedReport!.id;
    } else {
      const { data: newReport } = await supabaseClient
        .from("rca_reports")
        .insert({
          incident_id: incident.id,
          second_pass_id: secondPassId,
          executive_summary: reportContent.executiveSummary,
          incident_details: reportContent.incidentDetails,
          investigation_findings: reportContent.investigationFindings,
          root_cause_tree: reportContent.rootCauseTree,
          recommendations: reportContent.recommendations,
          compliance_references: reportContent.complianceReferences,
          report_status: "draft",
          generated_by: user.id,
        })
        .select()
        .single();
      reportId = newReport!.id;
    }

    await supabaseClient.from("audit_logs").insert({
      incident_id: incident.id,
      action_type: "RCA_REPORT_GENERATED",
      action_details: {
        report_id: reportId,
        second_pass_id: secondPassId,
      },
      entity_type: "rca_report",
      entity_id: reportId,
      performed_by: user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        reportId,
        report: reportContent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating RCA report:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate RCA report",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function generateFormalRCAReport(
  incident: any,
  secondPass: any,
  firstPass: any,
  review: any
): Promise<any> {
  const executiveSummary = secondPass.refined_analysis?.executiveSummary || 
    `This report presents the findings of the Root Cause Analysis investigation into incident ${incident?.incident_number || 'Unknown'}. The incident was classified as ${incident?.severity || 'Unknown'} severity and occurred on ${incident?.incident_date ? new Date(incident.incident_date).toLocaleDateString() : 'Unknown date'}. Through systematic investigation using the 5 Whys and Fishbone methodologies, ${secondPass.root_causes?.length || 0} root causes were identified, with ${secondPass.corrective_actions?.length || 0} corrective actions and ${secondPass.preventive_actions?.length || 0} preventive measures recommended.`;

  const incidentDetails = {
    incidentNumber: incident?.incident_number || 'Unknown',
    incidentType: incident?.incident_type || 'Unknown',
    severity: incident?.severity || 'Unknown',
    dateTime: incident?.incident_date || 'Unknown',
    location: incident?.location || 'Unknown',
    description: incident?.description || 'No description',
    reportedBy: incident?.reported_by || 'Unknown',
    investigator: incident?.assigned_investigator || 'Unknown',
    investigationDate: new Date().toISOString(),
  };

  const investigationFindings = {
    methodology: "This investigation employed multiple Root Cause Analysis techniques including the 5 Whys method, Fishbone (Ishikawa) diagram analysis, and Barrier Analysis to identify underlying causes.",
    evidenceCollected: `Analysis included incident description, ${review ? 'human expert review, ' : ''}AI-assisted pattern recognition, and documentary evidence.`,
    immediateCauses: secondPass.immediate_causes || [],
    contributingFactors: secondPass.contributing_factors || [],
    rootCauses: secondPass.root_causes || [],
    fiveWhysAnalysis: secondPass.root_cause_analysis?.fiveWhysAnalysis || [],
    barrierAnalysis: secondPass.root_cause_analysis?.barrierAnalysis || "Analysis of preventive barriers that failed or were absent.",
  };

  const rootCauseTree = {
    fishboneDiagram: secondPass.root_cause_analysis?.fishboneDiagram || {
      People: [],
      Process: [],
      Equipment: [],
      Environment: [],
      Management: [],
    },
    causalChain: {
      incident: incident?.title || 'Unknown incident',
      immediateCauses: secondPass.immediate_causes || [],
      underlyingCauses: secondPass.contributing_factors || [],
      rootCauses: secondPass.root_causes || [],
    },
  };

  const recommendations = {
    correctiveActions: (secondPass.corrective_actions || []).map((action: any) => {
      if (typeof action === 'string') {
        return {
          action,
          priority: 'medium',
          timeline: 'To be determined',
          responsibility: 'To be assigned',
        };
      }
      return action;
    }),
    preventiveActions: (secondPass.preventive_actions || []).map((action: any) => {
      if (typeof action === 'string') {
        return {
          action,
          type: 'preventive',
        };
      }
      return action;
    }),
    hierarchyOfControls: {
      elimination: [],
      substitution: [],
      engineering: [],
      administrative: [],
      ppe: [],
    },
  };

  const complianceReferences = [
    ...(secondPass.root_cause_analysis?.complianceReferences || []),
    "OSHA General Duty Clause 5(a)(1)",
    "ISO 45001:2018 - Occupational Health and Safety Management Systems",
  ];

  return {
    executiveSummary,
    incidentDetails,
    investigationFindings,
    rootCauseTree,
    recommendations,
    complianceReferences,
  };
}