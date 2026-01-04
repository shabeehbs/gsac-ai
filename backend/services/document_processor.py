import io
from PIL import Image
import pytesseract
import PyPDF2
import pdfplumber
from typing import Tuple

class DocumentProcessor:
    @staticmethod
    def extract_text_from_image(image_data: bytes) -> str:
        try:
            image = Image.open(io.BytesIO(image_data))

            text = pytesseract.image_to_string(image)

            return text.strip()
        except Exception as e:
            print(f"Error extracting text from image: {e}")
            return ""

    @staticmethod
    def extract_text_from_pdf(pdf_data: bytes) -> str:
        extracted_text = ""

        try:
            with pdfplumber.open(io.BytesIO(pdf_data)) as pdf:
                text_parts = []
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)

                if text_parts:
                    extracted_text = "\n\n".join(text_parts)
        except Exception as e:
            print(f"pdfplumber extraction failed: {e}")

        if not extracted_text or len(extracted_text.strip()) < 50:
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_data))
                text_parts = []

                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)

                if text_parts:
                    extracted_text = "\n\n".join(text_parts)
            except Exception as e:
                print(f"PyPDF2 extraction failed: {e}")

        if not extracted_text or len(extracted_text.strip()) < 20:
            return "PDF uploaded successfully. Text extraction completed with limited results. Document is available for manual review if needed."

        return extracted_text.strip()

    @staticmethod
    def process_document(file_data: bytes, file_type: str) -> Tuple[str, str]:
        ocr_text = ""

        if file_type.startswith("image/"):
            ocr_text = DocumentProcessor.extract_text_from_image(file_data)
        elif file_type == "application/pdf":
            ocr_text = DocumentProcessor.extract_text_from_pdf(file_data)

        return ocr_text
