# Backend Setup Guide

The backend has been converted to use direct PostgreSQL connection instead of the Supabase client library.

## Quick Start

### 1. Get Your Database Password

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/pghblaezuatajsrhkvqa/settings/database)
2. Navigate to **Settings** → **Database**
3. Under **Connection string**, select **Connection pooling** mode
4. Copy the connection string or just the password

### 2. Configure Environment

Edit `/tmp/cc-agent/62145922/project/backend/.env`:

```env
DATABASE_URL=postgresql://postgres.pghblaezuatajsrhkvqa:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
PORT=8000
```

Replace `[YOUR-PASSWORD]` with your actual database password.

### 3. Install Dependencies

```bash
cd /tmp/cc-agent/62145922/project/backend
pip install -r requirements.txt
```

### 4. Start the Backend

```bash
python3 main.py
```

The backend will start at: http://localhost:8000

### 5. Test PDF Export

1. Make sure the backend is running
2. Go to your frontend application
3. Navigate to an incident with a completed RCA report
4. Click the "Export as PDF" button
5. The PDF should download automatically

## What Changed

- **Removed**: Supabase Python client library
- **Added**: Direct PostgreSQL connection using `asyncpg`
- **Simplified**: Only PDF export endpoint is needed (other features use Supabase Edge Functions)

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `POST /api/pdf/export-rca-report` - Export RCA report as PDF

## Troubleshooting

### Cannot connect to database

Make sure:
1. Your DATABASE_URL is correct
2. You're using the connection pooling URL (port 6543), not the direct connection
3. Your database password is correct

### Module not found errors

```bash
cd backend
pip install -r requirements.txt
```

### Port already in use

Change the PORT in your `.env` file to a different port (e.g., 8001).
