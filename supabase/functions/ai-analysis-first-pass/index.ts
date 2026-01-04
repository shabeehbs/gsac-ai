import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FirstPassRequest {
  incidentId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { incidentId }: FirstPassRequest = await req.json();

    const { data: incident } = await supabaseAdmin
      .from("incidents")
      .select("*")
      .eq("id", incidentId)
      .single();

    if (!incident) {
      throw new Error("Incident not found");
    }

    const { data: documents } = await supabaseAdmin
      .from("incident_documents")
      .select("*")
      .eq("incident_id", incidentId);

    const { data: existingAnalysis } = await supabaseAdmin
      .from("ai_analysis_first_pass")
      .select("*")
      .eq("incident_id", incidentId)
      .maybeSingle();

    if (existingAnalysis && existingAnalysis.processing_status === "completed") {
      return new Response(
        JSON.stringify({
          success: true,
          analysisId: existingAnalysis.id,
          message: "Analysis already completed",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let analysisId = existingAnalysis?.id;

    if (!existingAnalysis) {
      const { data: newAnalysis } = await supabaseAdmin
        .from("ai_analysis_first_pass")
        .insert({
          incident_id: incidentId,
          processing_status: "processing",
          created_by: user.id,
        })
        .select()
        .single();
      analysisId = newAnalysis?.id;
    } else {
      await supabaseAdmin
        .from("ai_analysis_first_pass")
        .update({ processing_status: "processing" })
        .eq("id", analysisId);
    }

    const analysisResult = await performFirstPassAnalysis(
      incident,
      documents || []
    );

    await supabaseAdmin
      .from("ai_analysis_first_pass")
      .update({
        analysis_data: analysisResult.analysisData,
        identified_hazards: analysisResult.identifiedHazards,
        potential_causes: analysisResult.potentialCauses,
        recommended_actions: analysisResult.recommendedActions,
        confidence_score: analysisResult.confidenceScore,
        processing_status: "completed",
      })
      .eq("id", analysisId);

    await supabaseAdmin
      .from("incidents")
      .update({ status: "under_investigation" })
      .eq("id", incidentId);

    await supabaseAdmin.from("audit_logs").insert({
      incident_id: incidentId,
      action_type: "AI_ANALYSIS_FIRST_PASS_COMPLETED",
      action_details: {
        analysis_id: analysisId,
        hazards_count: analysisResult.identifiedHazards.length,
        causes_count: analysisResult.potentialCauses.length,
        confidence_score: analysisResult.confidenceScore,
      },
      entity_type: "ai_analysis_first_pass",
      entity_id: analysisId,
      performed_by: user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysisId,
        result: analysisResult,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in first pass analysis:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to perform first pass analysis",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function performFirstPassAnalysis(
  incident: any,
  documents: any[]
): Promise<any> {
  try {
    const truncate = (text: string, maxChars: number): string => {
      if (!text || text.length <= maxChars) return text;
      return text.substring(0, maxChars) + "... [truncated]";
    };

    const documentsContext = documents
      .slice(0, 5)
      .map((doc) => {
        const ocrText = truncate(doc.ocr_text || "N/A", 500);
        const aiDesc = truncate(doc.ai_description || "N/A", 300);
        return `Document: ${doc.file_name}\nOCR Text: ${ocrText}\nAI Description: ${aiDesc}`;
      })
      .join("\n\n");

    const truncatedDescription = truncate(incident.description || "", 1000);

    const prompt = `You are an expert HSE (Health, Safety, and Environment) incident investigator. Perform a comprehensive first-pass analysis of this incident.

**INCIDENT DETAILS:**
Type: ${incident.incident_type}
Severity: ${incident.severity}
Date: ${incident.incident_date}
Location: ${incident.location}
Title: ${incident.title}
Description: ${truncatedDescription}

**SUPPORTING DOCUMENTS:**
${documentsContext || "No documents attached"}

**YOUR TASK:**
Provide a structured analysis in JSON format with the following fields:

1. **identifiedHazards**: Array of specific hazards identified (5-10 items)
2. **potentialCauses**: Array of potential root causes (5-10 items, ranked by likelihood)
3. **recommendedActions**: Array of immediate and investigative actions (5-10 items)
4. **confidenceScore**: Your confidence in this analysis (0.0 to 1.0)
5. **analysisData**: Detailed analysis object containing:
   - summary: Brief executive summary
   - timeline: Inferred timeline of events
   - peopleInvolved: Roles/positions involved
   - equipmentInvolved: Equipment, machinery, or tools involved
   - environmentalFactors: Weather, lighting, noise, etc.
   - humanFactors: Training, fatigue, communication issues
   - organizationalFactors: Procedures, supervision, safety culture
   - complianceGaps: Potential regulatory or standard violations
   - similarIncidents: Note if this appears similar to common incident patterns

**CRITICAL REQUIREMENTS:**
- Be objective and evidence-based
- Flag areas requiring human expert review
- Note any missing information critical to the investigation
- Consider both immediate and underlying causes
- Reference relevant safety standards (OSHA, ISO 45001, etc.) where applicable

Return ONLY valid JSON, no additional text.`;

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY is not configured in Supabase secrets");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert HSE incident investigator with 20+ years of experience. You analyze incidents methodically and provide actionable insights.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", result);
      throw new Error(`OpenAI API error: ${result.error?.message || JSON.stringify(result)}`);
    }

    const analysisText = result.choices[0]?.message?.content;

    if (!analysisText) {
      throw new Error("No analysis generated from OpenAI response");
    }

    const analysis = JSON.parse(analysisText);

    return {
      identifiedHazards: analysis.identifiedHazards || [],
      potentialCauses: analysis.potentialCauses || [],
      recommendedActions: analysis.recommendedActions || [],
      confidenceScore: analysis.confidenceScore || 0.7,
      analysisData: analysis.analysisData || {},
    };
  } catch (error) {
    console.error("Error performing AI analysis:", error);
    throw error;
  }
}
