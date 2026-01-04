from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime
import json

from utils.db_client import get_db_pool
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
        pool = await get_db_pool()

        async with pool.acquire() as conn:
            incident_data = await conn.fetchrow(
                'SELECT * FROM incidents WHERE id = $1',
                request.incident_id
            )

            if not incident_data:
                raise HTTPException(status_code=404, detail="Incident not found")

            incident_dict = dict(incident_data)

            witnesses = await conn.fetch(
                'SELECT * FROM witnesses WHERE incident_id = $1',
                request.incident_id
            )
            documents = await conn.fetch(
                'SELECT * FROM incident_documents WHERE incident_id = $1',
                request.incident_id
            )

            incident_dict['witnesses'] = [dict(w) for w in witnesses]
            incident_dict['documents'] = [dict(d) for d in documents]

        findings = await AIService.perform_first_pass_analysis(incident_dict)

        async with pool.acquire() as conn:
            findings_json = json.dumps(findings)
            analysis_id = await conn.fetchval(
                '''INSERT INTO incident_analyses (incident_id, analysis_type, findings, performed_at)
                   VALUES ($1, $2, $3, $4) RETURNING id''',
                request.incident_id, "FIRST_PASS", findings_json, datetime.utcnow()
            )

            if not analysis_id:
                raise HTTPException(status_code=500, detail="Failed to save analysis")

            await conn.execute(
                'UPDATE incidents SET investigation_status = $1 WHERE id = $2',
                "IN_REVIEW", request.incident_id
            )

            action_details = json.dumps({
                "analysis_id": str(analysis_id),
                "confidence_score": findings.get('confidence_score', 0)
            })
            await conn.execute(
                '''INSERT INTO audit_logs (incident_id, action_type, action_details, entity_type, entity_id, performed_by)
                   VALUES ($1, $2, $3, $4, $5, $6)''',
                request.incident_id, "AI_ANALYSIS_FIRST_PASS", action_details,
                "incident_analysis", str(analysis_id), None
            )

        return AnalysisResponse(
            success=True,
            analysis_id=str(analysis_id),
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
        pool = await get_db_pool()

        async with pool.acquire() as conn:
            review_data = await conn.fetchrow(
                'SELECT * FROM human_reviews WHERE id = $1',
                request.review_id
            )
            if not review_data:
                raise HTTPException(status_code=404, detail="Review not found")

            review_dict = dict(review_data)

            if review_dict.get("review_status") != "approved":
                raise HTTPException(status_code=400, detail="Review must be approved")

            first_pass_data = await conn.fetchrow(
                'SELECT * FROM ai_analysis_first_pass WHERE id = $1',
                review_dict["analysis_id"]
            )
            if not first_pass_data:
                raise HTTPException(status_code=404, detail="First pass analysis not found")

            incident_data = await conn.fetchrow(
                'SELECT * FROM incidents WHERE id = $1',
                review_dict["incident_id"]
            )
            if not incident_data:
                raise HTTPException(status_code=404, detail="Incident not found")

            existing = await conn.fetchrow(
                '''SELECT id FROM ai_analysis_second_pass
                   WHERE human_review_id = $1 AND processing_status = $2''',
                request.review_id, "completed"
            )
            if existing:
                return {"success": True, "second_pass_id": str(existing["id"]), "message": "Already completed"}

        result = await AIService.perform_comprehensive_second_pass(
            dict(incident_data),
            dict(first_pass_data),
            review_dict
        )

        async with pool.acquire() as conn:
            refined_analysis_json = json.dumps(result.get("refined_analysis", {}))
            root_cause_analysis_json = json.dumps(result.get("root_cause_analysis", {}))
            contributing_factors_json = json.dumps(result.get("contributing_factors", []))
            immediate_causes_json = json.dumps(result.get("immediate_causes", []))
            root_causes_json = json.dumps(result.get("root_causes", []))
            corrective_actions_json = json.dumps(result.get("corrective_actions", []))
            preventive_actions_json = json.dumps(result.get("preventive_actions", []))

            second_pass_id = await conn.fetchval(
                '''INSERT INTO ai_analysis_second_pass
                   (incident_id, first_pass_id, human_review_id, refined_analysis, root_cause_analysis,
                    contributing_factors, immediate_causes, root_causes, corrective_actions, preventive_actions, processing_status)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id''',
                review_dict["incident_id"], review_dict["analysis_id"], request.review_id,
                refined_analysis_json, root_cause_analysis_json, contributing_factors_json,
                immediate_causes_json, root_causes_json, corrective_actions_json,
                preventive_actions_json, "completed"
            )

            if not second_pass_id:
                raise HTTPException(status_code=500, detail="Failed to save second pass analysis")

            await conn.execute(
                'UPDATE incidents SET status = $1 WHERE id = $2',
                "pending_review", review_dict["incident_id"]
            )

            action_details = json.dumps({
                "second_pass_id": str(second_pass_id),
                "review_id": request.review_id,
                "root_causes_count": len(result.get("root_causes", []))
            })
            await conn.execute(
                '''INSERT INTO audit_logs (incident_id, action_type, action_details, entity_type, entity_id, performed_by)
                   VALUES ($1, $2, $3, $4, $5, $6)''',
                review_dict["incident_id"], "AI_ANALYSIS_SECOND_PASS_COMPLETED", action_details,
                "ai_analysis_second_pass", str(second_pass_id), None
            )

        return {
            "success": True,
            "second_pass_id": str(second_pass_id),
            "result": result
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in second pass from review: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to perform analysis: {str(e)}")
