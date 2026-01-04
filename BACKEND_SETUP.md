# Backend Setup Guide

The backend has been fully converted to use PostgreSQL for all database operations while keeping Supabase Storage for file storage.

## Architecture

- **Database**: Direct PostgreSQL connection using `asyncpg` for all CRUD operations
- **Storage**: Supabase Storage API for document uploads (images, PDFs)
- **AI**: OpenAI API for analysis and report generation

## Quick Start

### 1. Install Prerequisites

#### Tesseract OCR (Required)

**Ubuntu/Debian:**
```bash
sudo apt-get update && sudo apt-get install tesseract-ocr
```

**macOS:**
```bash
brew install tesseract
```

**Windows:**
Download from: https://github.com/UB-Mannheim/tesseract/wiki

### 2. Get Your Credentials

#### Database Password
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/pghblaezuatajsrhkvqa/settings/database)
2. Navigate to **Settings** → **Database**
3. Under **Connection string**, select **Connection pooling** mode
4. Copy the password

#### Service Role Key
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/pghblaezuatajsrhkvqa/settings/api)
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (not the anon key!)

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key

### 3. Configure Environment

Copy the example file:
```bash
cd /tmp/cc-agent/62145922/project/backend
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

### 4. Install Dependencies

```bash
cd /tmp/cc-agent/62145922/project/backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Start the Backend

```bash
python3 main.py
```

The backend will start at: http://localhost:8000

Visit http://localhost:8000/docs to see the API documentation.

### 6. Test the API

You can test the endpoints using the Swagger UI at http://localhost:8000/docs or use curl:

```bash
# Health check
curl http://localhost:8000/health

# Process a document (requires document_id from frontend)
curl -X POST http://localhost:8000/api/process-document \
  -H "Content-Type: application/json" \
  -d '{"document_id": "uuid", "file_type": "application/pdf"}'
```

## API Endpoints

### Documents
- `POST /api/process-document` - Process uploaded documents with OCR

### Analysis
- `POST /api/ai-analysis-first-pass` - Initial AI analysis
- `POST /api/ai-analysis-second-pass-from-review` - Deep RCA after human review

### Reports
- `POST /api/generate-rca-report` - Generate RCA report

### PDF Export
- `POST /api/pdf/export-rca-report` - Export RCA report as PDF

## What Changed

**Database Operations:**
- All database queries now use PostgreSQL directly via `asyncpg`
- No more Supabase client for database operations

**File Storage:**
- Still using Supabase Storage for document uploads
- Created separate `storage_client.py` for storage operations

**Benefits:**
- Better performance with connection pooling
- More control over SQL queries
- Easier to optimize and debug database operations

## Troubleshooting

### Cannot connect to database

Make sure:
1. Your DATABASE_URL is correct
2. You're using the connection pooling URL (port 6543), not the direct connection
3. Your database password is correct

### Tesseract not found

Install Tesseract OCR (see step 1 above)

### Module not found errors

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Storage access errors

Make sure you're using the **service_role** key, not the anon key

### OpenAI API errors

Verify your OpenAI API key is valid and has credits

### Port already in use

Change the PORT in your `.env` file to a different port (e.g., 8001)
