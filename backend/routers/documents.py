from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import os

from utils.supabase_client import get_supabase_client
from services.document_processor import DocumentProcessor

router = APIRouter()

class ProcessDocumentRequest(BaseModel):
    document_id: str
    file_type: str

class ProcessDocumentResponse(BaseModel):
    success: bool
    document_id: str
    ocr_text: str
    ai_description: str

async def get_ai_description(file_data: bytes, file_type: str) -> str:
    if not os.getenv("OPENAI_API_KEY"):
        return "Image uploaded successfully. OCR text extraction completed."

    try:
        from services.ai_service import AIService
        return await AIService.generate_image_description(file_data, file_type)
    except Exception as e:
        print(f"AI description failed, using fallback: {e}")
        return "Image uploaded successfully. OCR text extraction completed."

@router.post("/process-document", response_model=ProcessDocumentResponse)
async def process_document(request: ProcessDocumentRequest):
    try:
        supabase = get_supabase_client()

        supabase.table("incident_documents").update({
            "ocr_status": "processing"
        }).eq("id", request.document_id).execute()

        document = supabase.table("incident_documents").select("*").eq("id", request.document_id).single().execute()

        if not document.data:
            raise HTTPException(status_code=404, detail="Document not found")

        doc_data = document.data

        file_response = supabase.storage.from_("incident-documents").download(doc_data["storage_path"])

        if not file_response:
            raise HTTPException(status_code=404, detail="File not found in storage")

        ocr_text = ""
        ai_description = ""

        if request.file_type.startswith("image/"):
            ocr_text = DocumentProcessor.extract_text_from_image(file_response)
            ai_description = await get_ai_description(file_response, request.file_type)
        elif request.file_type == "application/pdf":
            ocr_text = DocumentProcessor.extract_text_from_pdf(file_response)
            ai_description = "PDF document processed for text extraction"

        supabase.table("incident_documents").update({
            "ocr_text": ocr_text,
            "ai_description": ai_description,
            "ocr_status": "completed"
        }).eq("id", request.document_id).execute()

        try:
            supabase.table("audit_logs").insert({
                "incident_id": doc_data["incident_id"],
                "action_type": "DOCUMENT_PROCESSED",
                "action_details": {
                    "document_id": request.document_id,
                    "file_name": doc_data["file_name"],
                    "ocr_completed": True
                },
                "entity_type": "incident_document",
                "entity_id": request.document_id,
                "performed_by": None
            }).execute()
        except Exception as audit_err:
            print(f"Audit log failed (non-critical): {audit_err}")

        return ProcessDocumentResponse(
            success=True,
            document_id=request.document_id,
            ocr_text=ocr_text,
            ai_description=ai_description
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing document: {e}")
        try:
            supabase = get_supabase_client()
            supabase.table("incident_documents").update({
                "ocr_status": "failed"
            }).eq("id", request.document_id).execute()
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
