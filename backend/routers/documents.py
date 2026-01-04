from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import httpx
import os
import json

from utils.database import Database
from utils.storage import StorageClient
from utils.auth import get_current_user
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
async def process_document(request: ProcessDocumentRequest, current_user: dict = Depends(get_current_user)):
    try:
        await Database.execute(
            'UPDATE documents SET extracted_text = $1 WHERE id = $2',
            'processing', request.document_id
        )

        doc_data = await Database.fetch_one(
            'SELECT * FROM documents WHERE id = $1',
            request.document_id
        )

        if not doc_data:
            raise HTTPException(status_code=404, detail="Document not found")

        file_data = StorageClient.download_file(doc_data["storage_path"])

        if not file_data:
            raise HTTPException(status_code=404, detail="File not found in storage")

        ocr_text = ""
        ai_description = ""

        if request.file_type.startswith("image/"):
            ocr_text = DocumentProcessor.extract_text_from_image(file_data)
            ai_description = await get_ai_description(file_data, request.file_type)
        elif request.file_type == "application/pdf":
            ocr_text = DocumentProcessor.extract_text_from_pdf(file_data)
            ai_description = "PDF document processed for text extraction"

        await Database.execute(
            'UPDATE documents SET extracted_text = $1, metadata = metadata || $2 WHERE id = $3',
            ocr_text,
            json.dumps({"ai_description": ai_description, "status": "completed"}),
            request.document_id
        )

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
            await Database.execute(
                'UPDATE documents SET metadata = metadata || $1 WHERE id = $2',
                json.dumps({"status": "failed"}),
                request.document_id
            )
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
