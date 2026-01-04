from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from utils.supabase_client import get_supabase_client
from services.pdf_generator import generate_rca_pdf

router = APIRouter(prefix="/pdf", tags=["PDF Export"])


class PDFExportRequest(BaseModel):
    incident_id: str


@router.post("/export-rca-report")
async def export_rca_report(request: PDFExportRequest):
    try:
        supabase = get_supabase_client()

        incident_response = supabase.table('incidents').select('*').eq('id', request.incident_id).maybe_single().execute()
        if not incident_response.data:
            raise HTTPException(status_code=404, detail="Incident not found")

        incident_data = incident_response.data

        report_response = supabase.table('rca_reports').select('*').eq('incident_id', request.incident_id).maybe_single().execute()
        if not report_response.data:
            raise HTTPException(status_code=404, detail="RCA report not found")

        report_data = report_response.data

        analysis_response = supabase.table('ai_analysis_second_pass').select('*').eq('incident_id', request.incident_id).maybe_single().execute()
        if not analysis_response.data:
            raise HTTPException(status_code=404, detail="Analysis data not found")

        analysis_data = analysis_response.data

        pdf_buffer = generate_rca_pdf(report_data, incident_data, analysis_data)

        filename = f"RCA_Report_{report_data.get('report_number', 'Unknown').replace('/', '_')}.pdf"

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
