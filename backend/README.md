# HSE Incident Investigation Backend

FastAPI backend for HSE incident investigation and RCA reporting system.

## Features

- **PDF Export**: Generate professional PDF reports from RCA analysis
- **PostgreSQL Database**: Direct connection to Supabase PostgreSQL database
- **RESTful API**: Clean FastAPI architecture with proper error handling

## API Endpoints

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check endpoint

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
PORT=8000
```

Replace `[YOUR-PASSWORD]` with your Supabase database password.

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
python3 -m py_compile main.py routers/pdf_export.py services/pdf_generator.py utils/db_client.py
```

### Project Structure

```
backend/
├── main.py                     # FastAPI app entry point
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables (create from .env.example)
├── routers/
│   ├── __init__.py
│   └── pdf_export.py          # PDF export endpoints
├── services/
│   ├── __init__.py
│   └── pdf_generator.py       # RCA report PDF generation
└── utils/
    ├── __init__.py
    └── db_client.py           # PostgreSQL connection

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
- `PORT` (usually provided by platform)

## Troubleshooting

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
