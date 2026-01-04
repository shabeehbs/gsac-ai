from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

from utils.supabase_client import get_supabase_client
from services.ai_service import AIService

router = APIRouter()

class FirstPassAnalysisRequest(BaseModel):
    incident_id: str

class SecondPassAnalysisRequest(BaseModel):
    incident_id: str
    human_feedback: str

class SecondPassFromReviewRequest(BaseModel):
    review_id: str

class AnalysisResponse(BaseModel):
    success: bool
    analysis_id: str
    findings: Dict[str, Any]

@router.post("/ai-analysis-first-pass", response_model=AnalysisResponse)
async def first_pass_analysis(request: FirstPassAnalysisRequest):
    try:
        supabase = get_supabase_client()

        incident = supabase.table("incidents").select("*").eq("id", request.incident_id).single().execute()

        if not incident.data:
            raise HTTPException(status_code=404, detail="Incident not found")

        incident_data = incident.data

        witnesses = supabase.table("witnesses").select("*").eq("incident_id", request.incident_id).execute()
        documents = supabase.table("incident_documents").select("*").eq("incident_id", request.incident_id).execute()

        incident_data['witnesses'] = witnesses.data or []
        incident_data['documents'] = documents.data or []

        findings = await AIService.perform_first_pass_analysis(incident_data)

        analysis = supabase.table("incident_analyses").insert({
            "incident_id": request.incident_id,
            "analysis_type": "FIRST_PASS",
            "findings": findings,
            "performed_at": datetime.utcnow().isoformat()
        }).execute()

        if not analysis.data:
            raise HTTPException(status_code=500, detail="Failed to save analysis")

        analysis_id = analysis.data[0]['id']

        supabase.table("incidents").update({
            "investigation_status": "IN_REVIEW"
        }).eq("id", request.incident_id).execute()

        supabase.table("audit_logs").insert({
            "incident_id": request.incident_id,
            "action_type": "AI_ANALYSIS_FIRST_PASS",
            "action_details": {
                "analysis_id": analysis_id,
                "confidence_score": findings.get('confidence_score', 0)
            },
            "entity_type": "incident_analysis",
            "entity_id": analysis_id,
            "performed_by": None
        }).execute()

        return AnalysisResponse(
            success=True,
            analysis_id=analysis_id,
            findings=findings
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in first pass analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to perform analysis: {str(e)}")

@router.post("/ai-analysis-second-pass-from-review")
async def second_pass_from_review(request: SecondPassFromReviewRequest):
    try:
        supabase = get_supabase_client()

        review = supabase.table("human_reviews").select("*").eq("id", request.review_id).single().execute()
        if not review.data:
            raise HTTPException(status_code=404, detail="Review not found")

        review_data = review.data

        if review_data.get("review_status") != "approved":
            raise HTTPException(status_code=400, detail="Review must be approved")

        first_pass = supabase.table("ai_analysis_first_pass").select("*").eq("id", review_data["analysis_id"]).single().execute()
        if not first_pass.data:
            raise HTTPException(status_code=404, detail="First pass analysis not found")

        incident = supabase.table("incidents").select("*").eq("id", review_data["incident_id"]).single().execute()
        if not incident.data:
            raise HTTPException(status_code=404, detail="Incident not found")

        existing = supabase.table("ai_analysis_second_pass").select("id").eq("human_review_id", request.review_id).eq("processing_status", "completed").execute()
        if existing.data and len(existing.data) > 0:
            return {"success": True, "second_pass_id": existing.data[0]["id"], "message": "Already completed"}

        result = await AIService.perform_comprehensive_second_pass(
            incident.data,
            first_pass.data,
            review_data
        )

        second_pass = supabase.table("ai_analysis_second_pass").insert({
            "incident_id": review_data["incident_id"],
            "first_pass_id": review_data["analysis_id"],
            "human_review_id": request.review_id,
            "refined_analysis": result.get("refined_analysis", {}),
            "root_cause_analysis": result.get("root_cause_analysis", {}),
            "contributing_factors": result.get("contributing_factors", []),
            "immediate_causes": result.get("immediate_causes", []),
            "root_causes": result.get("root_causes", []),
            "corrective_actions": result.get("corrective_actions", []),
            "preventive_actions": result.get("preventive_actions", []),
            "processing_status": "completed"
        }).execute()

        if not second_pass.data:
            raise HTTPException(status_code=500, detail="Failed to save second pass analysis")

        supabase.table("incidents").update({
            "status": "pending_review"
        }).eq("id", review_data["incident_id"]).execute()

        supabase.table("audit_logs").insert({
            "incident_id": review_data["incident_id"],
            "action_type": "AI_ANALYSIS_SECOND_PASS_COMPLETED",
            "action_details": {
                "second_pass_id": second_pass.data[0]["id"],
                "review_id": request.review_id,
                "root_causes_count": len(result.get("root_causes", []))
            },
            "entity_type": "ai_analysis_second_pass",
            "entity_id": second_pass.data[0]["id"],
            "performed_by": None
        }).execute()

        return {
            "success": True,
            "second_pass_id": second_pass.data[0]["id"],
            "result": result
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in second pass from review: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to perform analysis: {str(e)}")
