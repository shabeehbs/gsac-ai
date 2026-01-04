import py_compile
import os
import sys

def test_python_syntax():
    print("=" * 60)
    print("Testing Python Syntax for Backend Files")
    print("=" * 60)

    backend_dir = os.path.dirname(os.path.abspath(__file__))

    files_to_test = [
        "main.py",
        "routers/documents.py",
        "routers/analysis.py",
        "routers/reports.py",
        "services/document_processor.py",
        "services/ai_service.py",
        "utils/supabase_client.py",
    ]

    all_passed = True

    for file_path in files_to_test:
        full_path = os.path.join(backend_dir, file_path)

        if not os.path.exists(full_path):
            print(f"✗ {file_path}: File not found")
            all_passed = False
            continue

        try:
            py_compile.compile(full_path, doraise=True)
            print(f"✓ {file_path}: Syntax valid")
        except py_compile.PyCompileError as e:
            print(f"✗ {file_path}: Syntax error")
            print(f"  {e}")
            all_passed = False

    print("\n" + "=" * 60)
    if all_passed:
        print("✓ All files passed syntax check")
        print("\nBackend structure is valid!")
        print("\nTo run the backend:")
        print("1. Install dependencies:")
        print("   cd backend")
        print("   python3 -m venv venv")
        print("   source venv/bin/activate  # On Windows: venv\\Scripts\\activate")
        print("   pip install -r requirements.txt")
        print("\n2. Install Tesseract OCR:")
        print("   Ubuntu: sudo apt-get install tesseract-ocr")
        print("   macOS: brew install tesseract")
        print("   Windows: https://github.com/UB-Mannheim/tesseract/wiki")
        print("\n3. Configure environment variables in backend/.env")
        print("\n4. Start the server:")
        print("   python3 main.py")
    else:
        print("✗ Some files have syntax errors")
        sys.exit(1)

    print("=" * 60)

if __name__ == "__main__":
    test_python_syntax()
