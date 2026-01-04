import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SecondPassRequest {
  reviewId: string;
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

    const { reviewId }: SecondPassRequest = await req.json();

    if (!reviewId) {
      return new Response(
        JSON.stringify({ error: "reviewId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: review, error: reviewError } = await supabaseClient
      .from("human_reviews")
      .select("*")
      .eq("id", reviewId)
      .single();

    if (reviewError || !review) {
      return new Response(
        JSON.stringify({ error: "Review not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (review.review_status !== "approved") {
      return new Response(
        JSON.stringify({ error: "Review must be approved before second pass analysis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: firstPassAnalysis } = await supabaseClient
      .from("ai_analysis_first_pass")
      .select("*")
      .eq("id", review.analysis_id)
      .single();

    if (!firstPassAnalysis) {
      return new Response(
        JSON.stringify({ error: "First pass analysis not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: incident } = await supabaseClient
      .from("incidents")
      .select("*")
      .eq("id", review.incident_id)
      .single();

    const { data: documents } = await supabaseClient
      .from("incident_documents")
      .select("*")
      .eq("incident_id", review.incident_id);

    const { data: existingSecondPass } = await supabaseClient
      .from("ai_analysis_second_pass")
      .select("*")
      .eq("human_review_id", reviewId)
      .maybeSingle();

    if (existingSecondPass && existingSecondPass.processing_status === "completed") {
      return new Response(
        JSON.stringify({
          success: true,
          secondPassId: existingSecondPass.id,
          message: "Second pass analysis already completed",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let secondPassId = existingSecondPass?.id;

    if (!existingSecondPass) {
      const { data: newSecondPass, error: insertError } = await supabaseClient
        .from("ai_analysis_second_pass")
        .insert({
          incident_id: review.incident_id,
          first_pass_id: review.analysis_id,
          human_review_id: reviewId,
          processing_status: "processing",
        })
        .select()
        .single();
      
      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create second pass record" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      secondPassId = newSecondPass?.id;
    } else {
      await supabaseClient
        .from("ai_analysis_second_pass")
        .update({ processing_status: "processing" })
        .eq("id", secondPassId);
    }

    const secondPassResult = await performSecondPassAnalysis(
      incident,
      firstPassAnalysis,
      review,
      documents || []
    );

    await supabaseClient
      .from("ai_analysis_second_pass")
      .update({
        refined_analysis: secondPassResult.refinedAnalysis,
        root_cause_analysis: secondPassResult.rootCauseAnalysis,
        contributing_factors: secondPassResult.contributingFactors,
        immediate_causes: secondPassResult.immediateCauses,
        root_causes: secondPassResult.rootCauses,
        corrective_actions: secondPassResult.correctiveActions,
        preventive_actions: secondPassResult.preventiveActions,
        processing_status: "completed",
      })
      .eq("id", secondPassId);

    await supabaseClient
      .from("incidents")
      .update({ status: "pending_review" })
      .eq("id", review.incident_id);

    await supabaseClient.from("audit_logs").insert({
      incident_id: review.incident_id,
      action_type: "AI_ANALYSIS_SECOND_PASS_COMPLETED",
      action_details: {
        second_pass_id: secondPassId,
        review_id: reviewId,
        root_causes_count: secondPassResult.rootCauses.length,
      },
      entity_type: "ai_analysis_second_pass",
      entity_id: secondPassId,
      performed_by: user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        secondPassId,
        result: secondPassResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in second pass analysis:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to perform second pass analysis",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function performSecondPassAnalysis(
  incident: any,
  firstPassAnalysis: any,
  review: any,
  documents: any[]
): Promise<any> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  
  if (!openaiKey) {
    console.error("OPENAI_API_KEY not configured");
    throw new Error("AI service not configured");
  }

  const prompt = `You are an expert HSE incident investigator performing a refined Root Cause Analysis (RCA). You are working with human expert feedback to produce a comprehensive, formal investigation.

**INCIDENT DETAILS:**
Type: ${incident?.incident_type || "Unknown"}
Severity: ${incident?.severity || "Unknown"}
Date: ${incident?.incident_date || "Unknown"}
Location: ${incident?.location || "Unknown"}
Title: ${incident?.title || "Unknown"}
Description: ${incident?.description || "No description"}

**FIRST PASS AI ANALYSIS:**
Identified Hazards: ${JSON.stringify(firstPassAnalysis?.identified_hazards || [])}
Potential Causes: ${JSON.stringify(firstPassAnalysis?.potential_causes || [])}
Recommended Actions: ${JSON.stringify(firstPassAnalysis?.recommended_actions || [])}
Analysis Data: ${JSON.stringify(firstPassAnalysis?.analysis_data || {})}

**HUMAN EXPERT REVIEW:**
Review Status: ${review?.review_status || "Unknown"}
Reviewer Notes: ${review?.reviewer_notes || "None"}
Approved Hazards: ${JSON.stringify(review?.approved_hazards || [])}
Approved Causes: ${JSON.stringify(review?.approved_causes || [])}
Additional Actions: ${JSON.stringify(review?.additional_actions || [])}
Corrections: ${JSON.stringify(review?.corrections || [])}

**YOUR TASK:**
Produce a comprehensive RCA following the "5 Whys" and "Fishbone" methodologies. Return a JSON object with:

1. **refinedAnalysis**: Object containing:
   - executiveSummary: 2-3 paragraph summary for leadership
   - incidentSequence: Detailed timeline of events
   - evidenceReview: Summary of all evidence considered
   - witnessAccounts: Note about witness information if available
   - investigationMethodology: Methods used in this investigation

2. **rootCauseAnalysis**: Object following structured RCA:
   - fiveWhysAnalysis: Array of 5 progressive "why" questions and answers
   - fishboneDiagram: Object with categories (People, Process, Equipment, Environment, Management) and factors
   - barrierAnalysis: What barriers failed or were missing
   - energyTraceAnalysis: Energy sources and controls (if applicable)

3. **contributingFactors**: Array of 5-10 contributing factors
4. **immediateCauses**: Array of 3-7 immediate/direct causes
5. **rootCauses**: Array of 2-5 underlying root causes
6. **correctiveActions**: Array of 5-10 specific corrective actions with:
   - action: Description
   - responsibility: Who should implement
   - timeline: Suggested timeframe
   - priority: high/medium/low

7. **preventiveActions**: Array of 5-10 preventive measures to prevent recurrence
8. **complianceReferences**: Array of relevant standards (OSHA, ISO 45001, industry-specific)

**CRITICAL REQUIREMENTS:**
- Incorporate all human reviewer feedback and corrections
- Use approved hazards and causes from the human review
- Follow formal RCA methodology
- Be specific and actionable
- Reference relevant regulations and standards
- Consider systemic and organizational factors, not just individual actions
- Ensure recommendations follow the "hierarchy of controls" (Elimination, Substitution, Engineering, Administrative, PPE)

Return ONLY valid JSON, no additional text.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a senior HSE investigator with expertise in Root Cause Analysis, OSHA regulations, and ISO 45001. You produce formal, compliance-grade investigation reports.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", errorText);
    throw new Error("AI analysis failed");
  }

  const result = await response.json();
  const analysisText = result.choices?.[0]?.message?.content;

  if (!analysisText) {
    throw new Error("No analysis generated");
  }

  const analysis = JSON.parse(analysisText);

  return {
    refinedAnalysis: analysis.refinedAnalysis || {},
    rootCauseAnalysis: analysis.rootCauseAnalysis || {},
    contributingFactors: analysis.contributingFactors || [],
    immediateCauses: analysis.immediateCauses || [],
    rootCauses: analysis.rootCauses || [],
    correctiveActions: analysis.correctiveActions || [],
    preventiveActions: analysis.preventiveActions || [],
    complianceReferences: analysis.complianceReferences || [],
  };
}