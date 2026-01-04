from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json

from utils.db_client import get_db_pool
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
        pool = await get_db_pool()

        async with pool.acquire() as conn:
            incident_data = await conn.fetchrow(
                'SELECT * FROM incidents WHERE id = $1',
                request.incident_id
            )

            if not incident_data:
                raise HTTPException(status_code=404, detail="Incident not found")

            incident_dict = dict(incident_data)

            if incident_dict.get('investigation_status') != 'COMPLETED':
                raise HTTPException(
                    status_code=400,
                    detail="Incident investigation must be completed before generating RCA report"
                )

            analyses = await conn.fetch(
                'SELECT * FROM incident_analyses WHERE incident_id = $1',
                request.incident_id
            )
            witnesses = await conn.fetch(
                'SELECT * FROM witnesses WHERE incident_id = $1',
                request.incident_id
            )
            documents = await conn.fetch(
                'SELECT * FROM incident_documents WHERE incident_id = $1',
                request.incident_id
            )

            incident_dict['analyses'] = [dict(a) for a in analyses]
            incident_dict['witnesses'] = [dict(w) for w in witnesses]
            incident_dict['documents'] = [dict(d) for d in documents]

        report_content = await AIService.generate_rca_report(incident_dict)

        async with pool.acquire() as conn:
            report_id = await conn.fetchval(
                '''INSERT INTO rca_reports (incident_id, report_content, generated_at, status)
                   VALUES ($1, $2, $3, $4) RETURNING id''',
                request.incident_id, report_content, datetime.utcnow(), "DRAFT"
            )

            if not report_id:
                raise HTTPException(status_code=500, detail="Failed to save report")

            action_details = json.dumps({
                "report_id": str(report_id),
                "report_length": len(report_content)
            })
            await conn.execute(
                '''INSERT INTO audit_logs (incident_id, action_type, action_details, entity_type, entity_id, performed_by)
                   VALUES ($1, $2, $3, $4, $5, $6)''',
                request.incident_id, "RCA_REPORT_GENERATED", action_details,
                "rca_report", str(report_id), None
            )

        return GenerateReportResponse(
            success=True,
            report_id=str(report_id),
            report_content=report_content
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating RCA report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
