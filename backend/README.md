# HSE Incident Investigation Backend

FastAPI backend for HSE incident investigation and RCA reporting system using Python libraries for cost-effective document processing.

## Features

- **Cost-Effective Text Extraction**: Uses free Python libraries instead of expensive API calls
  - PDF text extraction with PyPDF2 and pdfplumber
  - Image OCR with Tesseract (pytesseract)
- **AI-Powered Analysis**: Uses OpenAI only for intelligent analysis, not basic text extraction
- **Supabase Integration**: Complete database and storage integration
- **RESTful API**: Clean FastAPI architecture with proper error handling

## API Endpoints

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check endpoint

### Document Processing
- `POST /api/process-document` - Process uploaded documents (PDF/Images)
  ```json
  {
    "document_id": "uuid",
    "file_type": "application/pdf" or "image/*"
  }
  ```

### Analysis
- `POST /api/ai-analysis-first-pass` - Perform initial AI analysis
  ```json
  {
    "incident_id": "uuid"
  }
  ```

- `POST /api/ai-analysis-second-pass` - Perform deep root cause analysis
  ```json
  {
    "incident_id": "uuid",
    "human_feedback": "string"
  }
  ```

### Reports
- `POST /api/generate-rca-report` - Generate RCA report
  ```json
  {
    "incident_id": "uuid"
  }
  ```

## Setup

### Prerequisites

1. **Python 3.9+**
2. **Tesseract OCR** - Required for image text extraction

#### Install Tesseract

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

**macOS:**
```bash
brew install tesseract
```

**Windows:**
Download from: https://github.com/UB-Mannheim/tesseract/wiki

### Installation

1. **Create virtual environment:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
PORT=8000
```

4. **Start the server:**
```bash
python3 main.py
```

The API will be available at http://localhost:8000

## Development

### View API Documentation

Once the server is running:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Testing

Test syntax validity:
```bash
python3 -m py_compile main.py routers/*.py services/*.py utils/*.py
```

### Project Structure

```
backend/
├── main.py                     # FastAPI app entry point
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables (create from .env.example)
├── routers/
│   ├── __init__.py
│   ├── documents.py           # Document processing endpoints
│   ├── analysis.py            # AI analysis endpoints
│   └── reports.py             # RCA report generation
├── services/
│   ├── __init__.py
│   ├── document_processor.py  # PDF/Image text extraction
│   └── ai_service.py          # OpenAI integration
└── utils/
    ├── __init__.py
    └── supabase_client.py     # Supabase connection

```

## Cost Savings

This architecture saves significant API costs:

| Task | Old Approach | New Approach | Savings |
|------|--------------|--------------|---------|
| PDF Text Extraction | AI API calls | PyPDF2/pdfplumber | ~$0.01-0.05 per page |
| Image OCR | AI API calls | Tesseract | ~$0.05-0.10 per image |
| Image Analysis | AI API for everything | AI only for scene description | ~50-70% reduction |

**Example**: Processing 100 documents with 5 pages each
- Old cost: ~$25-50
- New cost: ~$2-5 (only for intelligent analysis)
- **Savings: ~80-90%**

## Production Deployment

### Deployment Options

- **Render**: Easy Python deployment
- **Railway**: Automatic deployments from Git
- **Fly.io**: Global edge deployment
- **AWS/GCP/Azure**: Enterprise deployments
- **Heroku**: Simple dyno-based hosting

### Important Notes

1. **Install Tesseract OCR** on your production server
2. **Set all environment variables** in your hosting platform
3. **Use production ASGI server**:
   ```bash
   pip install gunicorn
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

### Environment Variables (Production)

Set these in your hosting platform:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `PORT` (usually provided by platform)

## Troubleshooting

### Tesseract Not Found
```
Error: Tesseract not installed or not in PATH
```
**Solution**: Install Tesseract OCR for your operating system (see Prerequisites)

### Import Errors
```
ModuleNotFoundError: No module named 'fastapi'
```
**Solution**: Activate virtual environment and install dependencies:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Supabase Connection Error
```
ValueError: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set
```
**Solution**: Create `.env` file from `.env.example` and add your credentials

## License

MIT
