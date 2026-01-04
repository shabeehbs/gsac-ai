from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from utils.supabase_client import get_supabase_client
from services.ai_service import AIService

router = APIRouter()

class GenerateReportRequest(BaseModel):
    incident_id: str

class GenerateReportResponse(BaseModel):
    success: bool
    report_id: str
    report_content: str

@router.post("/generate-rca-report", response_model=GenerateReportResponse)
async def generate_rca_report(request: GenerateReportRequest):
    try:
        supabase = get_supabase_client()

        incident = supabase.table("incidents").select("*").eq("id", request.incident_id).single().execute()

        if not incident.data:
            raise HTTPException(status_code=404, detail="Incident not found")

        incident_data = incident.data

        if incident_data.get('investigation_status') != 'COMPLETED':
            raise HTTPException(
                status_code=400,
                detail="Incident investigation must be completed before generating RCA report"
            )

        analyses = supabase.table("incident_analyses").select("*").eq("incident_id", request.incident_id).execute()
        witnesses = supabase.table("witnesses").select("*").eq("incident_id", request.incident_id).execute()
        documents = supabase.table("incident_documents").select("*").eq("incident_id", request.incident_id).execute()

        incident_data['analyses'] = analyses.data or []
        incident_data['witnesses'] = witnesses.data or []
        incident_data['documents'] = documents.data or []

        report_content = await AIService.generate_rca_report(incident_data)

        report = supabase.table("rca_reports").insert({
            "incident_id": request.incident_id,
            "report_content": report_content,
            "generated_at": datetime.utcnow().isoformat(),
            "status": "DRAFT"
        }).execute()

        if not report.data:
            raise HTTPException(status_code=500, detail="Failed to save report")

        report_id = report.data[0]['id']

        supabase.table("audit_logs").insert({
            "incident_id": request.incident_id,
            "action_type": "RCA_REPORT_GENERATED",
            "action_details": {
                "report_id": report_id,
                "report_length": len(report_content)
            },
            "entity_type": "rca_report",
            "entity_id": report_id,
            "performed_by": None
        }).execute()

        return GenerateReportResponse(
            success=True,
            report_id=report_id,
            report_content=report_content
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating RCA report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
