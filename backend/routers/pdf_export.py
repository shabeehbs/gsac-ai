from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from utils.db_client import get_db_pool
from services.pdf_generator import generate_rca_pdf

router = APIRouter(prefix="/pdf", tags=["PDF Export"])


class PDFExportRequest(BaseModel):
    incident_id: str


@router.post("/export-rca-report")
async def export_rca_report(request: PDFExportRequest):
    try:
        pool = await get_db_pool()

        async with pool.acquire() as conn:
            incident_data = await conn.fetchrow(
                'SELECT * FROM incidents WHERE id = $1',
                request.incident_id
            )
            if not incident_data:
                raise HTTPException(status_code=404, detail="Incident not found")

            report_data = await conn.fetchrow(
                'SELECT * FROM rca_reports WHERE incident_id = $1',
                request.incident_id
            )
            if not report_data:
                raise HTTPException(status_code=404, detail="RCA report not found")

            analysis_data = await conn.fetchrow(
                'SELECT * FROM ai_analysis_second_pass WHERE incident_id = $1',
                request.incident_id
            )
            if not analysis_data:
                raise HTTPException(status_code=404, detail="Analysis data not found")

        incident_dict = dict(incident_data)
        report_dict = dict(report_data)
        analysis_dict = dict(analysis_data)

        pdf_buffer = generate_rca_pdf(report_dict, incident_dict, analysis_dict)

        filename = f"RCA_Report_{report_dict.get('report_number', 'Unknown').replace('/', '_')}.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")
