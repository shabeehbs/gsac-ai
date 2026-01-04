# HSE Incident Investigation Backend

FastAPI backend for HSE incident investigation and RCA reporting system using PostgreSQL for database operations.

## Features

- **PostgreSQL Database**: All database operations use direct PostgreSQL connection via asyncpg
- **Supabase Storage**: File storage for documents (images, PDFs) via Supabase Storage API
- **Document Processing**: PDF text extraction and image OCR with pytesseract
- **AI Analysis**: OpenAI-powered incident analysis and RCA report generation
- **PDF Export**: Generate professional PDF reports from RCA analysis
- **RESTful API**: Clean FastAPI architecture with proper error handling

## API Endpoints

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check endpoint

### Documents
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

- `POST /api/ai-analysis-second-pass-from-review` - Perform deep root cause analysis
  ```json
  {
    "review_id": "uuid"
  }
  ```

### Reports
- `POST /api/generate-rca-report` - Generate RCA report
  ```json
  {
    "incident_id": "uuid"
  }
  ```

### PDF Export
- `POST /api/pdf/export-rca-report` - Export RCA report as PDF
  ```json
  {
    "incident_id": "uuid"
  }
  ```
  Returns a PDF file for download

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
DATABASE_URL=postgresql://postgres.pghblaezuatajsrhkvqa:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://pghblaezuatajsrhkvqa.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
OPENAI_API_KEY=[YOUR-OPENAI-API-KEY]
PORT=8000
```

Replace the placeholders:
- `[YOUR-PASSWORD]` - Your Supabase database password
- `[YOUR-SERVICE-ROLE-KEY]` - Your Supabase service role key (for storage access)
- `[YOUR-OPENAI-API-KEY]` - Your OpenAI API key (for AI analysis)

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
│   ├── reports.py             # RCA report generation endpoints
│   └── pdf_export.py          # PDF export endpoints
├── services/
│   ├── __init__.py
│   ├── document_processor.py  # PDF/Image text extraction
│   ├── ai_service.py          # OpenAI integration
│   └── pdf_generator.py       # RCA report PDF generation
└── utils/
    ├── __init__.py
    ├── db_client.py           # PostgreSQL connection
    └── storage_client.py      # Supabase Storage connection

```

## Production Deployment

### Deployment Options

- **Render**: Easy Python deployment
- **Railway**: Automatic deployments from Git
- **Fly.io**: Global edge deployment
- **AWS/GCP/Azure**: Enterprise deployments
- **Heroku**: Simple dyno-based hosting

### Important Notes

1. **Set all environment variables** in your hosting platform
2. **Use production ASGI server**:
   ```bash
   pip install gunicorn
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

### Environment Variables (Production)

Set these in your hosting platform:
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `OPENAI_API_KEY` - Your OpenAI API key
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

### Database Connection Error
```
ValueError: DATABASE_URL must be set
```
**Solution**: Create `.env` file from `.env.example` and add your PostgreSQL connection string

## License

MIT
