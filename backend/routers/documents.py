from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import os
import json

from utils.db_client import get_db_pool
from utils.storage_client import get_storage_client
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
        pool = await get_db_pool()
        storage = get_storage_client()

        async with pool.acquire() as conn:
            await conn.execute(
                'UPDATE incident_documents SET ocr_status = $1 WHERE id = $2',
                'processing', request.document_id
            )

            doc_data = await conn.fetchrow(
                'SELECT * FROM incident_documents WHERE id = $1',
                request.document_id
            )

            if not doc_data:
                raise HTTPException(status_code=404, detail="Document not found")

        file_response = storage.storage.from_("incident-documents").download(doc_data["storage_path"])

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

        async with pool.acquire() as conn:
            await conn.execute(
                'UPDATE incident_documents SET ocr_text = $1, ai_description = $2, ocr_status = $3 WHERE id = $4',
                ocr_text, ai_description, 'completed', request.document_id
            )

            try:
                action_details = json.dumps({
                    "document_id": request.document_id,
                    "file_name": doc_data["file_name"],
                    "ocr_completed": True
                })
                await conn.execute(
                    '''INSERT INTO audit_logs (incident_id, action_type, action_details, entity_type, entity_id, performed_by)
                       VALUES ($1, $2, $3, $4, $5, $6)''',
                    doc_data["incident_id"], "DOCUMENT_PROCESSED", action_details,
                    "incident_document", request.document_id, None
                )
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
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    'UPDATE incident_documents SET ocr_status = $1 WHERE id = $2',
                    'failed', request.document_id
                )
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
