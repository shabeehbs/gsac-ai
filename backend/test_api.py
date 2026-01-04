import asyncio
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_document_processor():
    print("\n=== Testing Document Processor ===")

    try:
        from services.document_processor import DocumentProcessor
    except ImportError as e:
        print(f"✗ Failed to import DocumentProcessor: {e}")
        return

    print("\n1. Testing PDF text extraction...")
    sample_pdf = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Times-Roman\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000262 00000 n\n0000000341 00000 n\ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n430\n%%EOF"

    try:
        result = DocumentProcessor.extract_text_from_pdf(sample_pdf)
        print(f"✓ PDF extraction successful")
        print(f"  Result: {result[:100]}...")
    except Exception as e:
        print(f"✗ PDF extraction failed: {e}")

    print("\n2. Testing image text extraction...")
    print("  Note: Requires pytesseract and Tesseract OCR installed")
    print("  Skipping image test (requires actual image file)")

    print("\n✓ Document processor tests completed")

async def test_ai_service():
    print("\n=== Testing AI Service ===")
    print("Note: These tests require OPENAI_API_KEY to be set")

    try:
        from services.ai_service import AIService
    except ImportError as e:
        print(f"✗ Failed to import AIService: {e}")
        return

    if not os.getenv("OPENAI_API_KEY"):
        print("⚠ OPENAI_API_KEY not set, skipping AI tests")
        return

    print("\n1. Testing first pass analysis...")
    sample_incident = {
        'title': 'Test Incident',
        'description': 'Worker slipped on wet floor',
        'severity': 'medium',
        'location': 'Warehouse A',
        'incident_date': '2024-01-03',
        'witnesses': [],
        'documents': []
    }

    try:
        result = await AIService.perform_first_pass_analysis(sample_incident)
        print(f"✓ First pass analysis successful")
        print(f"  Analysis: {str(result)[:200]}...")
        print(f"  Confidence: {result.get('confidence_score', 'N/A')}")
    except Exception as e:
        print(f"✗ First pass analysis failed: {e}")

    print("\n✓ AI service tests completed")

def test_api_structure():
    print("\n=== Testing API Structure ===")

    print("\n1. Checking main.py imports...")
    try:
        from main import app
        print("✓ Main app imports successfully")
    except Exception as e:
        print(f"✗ Main app import failed: {e}")
        return

    print("\n2. Checking routers...")
    try:
        from routers import documents, analysis, reports
        print("✓ All routers import successfully")
    except Exception as e:
        print(f"✗ Router import failed: {e}")

    print("\n3. Checking services...")
    try:
        from services.document_processor import DocumentProcessor
        from services.ai_service import AIService
        print("✓ All services import successfully")
    except Exception as e:
        print(f"✗ Service import failed: {e}")

    print("\n4. Checking utilities...")
    try:
        from utils.supabase_client import get_supabase_client
        print("✓ Utilities import successfully")
    except Exception as e:
        print(f"✗ Utility import failed: {e}")

    print("\n✓ API structure tests completed")

def test_endpoint_definitions():
    print("\n=== Testing Endpoint Definitions ===")

    try:
        from main import app
        routes = []
        for route in app.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                routes.append(f"{list(route.methods)[0] if route.methods else 'GET'} {route.path}")

        print("\nRegistered endpoints:")
        for route in sorted(routes):
            print(f"  {route}")

        expected_endpoints = [
            '/api/process-document',
            '/api/ai-analysis-first-pass',
            '/api/ai-analysis-second-pass',
            '/api/generate-rca-report'
        ]

        print("\n✓ Endpoint definitions test completed")
        print(f"  Found {len(routes)} total endpoints")

    except Exception as e:
        print(f"✗ Endpoint definition test failed: {e}")

async def main():
    print("=" * 60)
    print("Backend API Test Suite")
    print("=" * 60)

    test_api_structure()
    test_endpoint_definitions()
    test_document_processor()
    await test_ai_service()

    print("\n" + "=" * 60)
    print("Test Suite Completed")
    print("=" * 60)
    print("\nNext Steps:")
    print("1. Install dependencies: pip install -r requirements.txt")
    print("2. Install Tesseract OCR on your system")
    print("3. Set OPENAI_API_KEY in backend/.env")
    print("4. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env")
    print("5. Start the server: python main.py")
    print("6. Test with: curl http://localhost:8000/health")

if __name__ == "__main__":
    asyncio.run(main())
