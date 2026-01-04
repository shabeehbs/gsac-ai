# RCA Platform - Root Cause Analysis & Incident Investigation

A comprehensive platform for HSE (Health, Safety, and Environment) incident investigation with AI-powered root cause analysis.

## Features

- 📝 **Incident Management**: Create and track incidents with detailed information
- 📄 **Document Processing**: Upload and extract text from various document formats (PDF, images)
- 🤖 **AI-Powered Analysis**: Automated root cause analysis using OpenAI
- 📊 **RCA Reports**: Generate comprehensive Root Cause Analysis reports
- 👥 **Human Review**: Review and validate AI-generated findings
- 📑 **PDF Export**: Export reports to professional PDF documents

## 🚀 Quick Start (Docker)

Run the entire application with one command:

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-your-key-here

# 3. Start everything
./start.sh
```

**Access the app**: http://localhost

**Requirements**: Docker, Docker Compose, OpenAI API Key

**See**: [QUICK_START.md](QUICK_START.md) for detailed step-by-step guide

## Default Login

- **Email**: `admin@example.com`
- **Password**: `admin123`

## Alternative Setup Options

### Local Development (Without Docker)

See [LOCAL_SETUP.md](LOCAL_SETUP.md) for manual setup with Python and Node.js.

### Cloud Setup with Supabase

See [BACKEND_SETUP.md](BACKEND_SETUP.md) for cloud deployment instructions.

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **PostgreSQL**: Relational database
- **MinIO**: S3-compatible object storage
- **OpenAI API**: AI-powered analysis
- **Tesseract**: OCR for document processing

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first styling
- **Vite**: Build tool and dev server

## Documentation

- [Docker Setup Guide](DOCKER_SETUP.md) - Full containerized deployment (recommended)
- [Local Setup Guide](LOCAL_SETUP.md) - Manual setup without Docker
- [Backend Setup](BACKEND_SETUP.md) - Cloud deployment with Supabase
- [Backend Verification](BACKEND_VERIFICATION.md) - Testing guide
- [Migration Guide](MIGRATION_TO_LOCAL.md) - Understanding the architecture changes

## Project Structure

```
.
├── backend/                 # FastAPI backend
│   ├── routers/            # API endpoints
│   ├── services/           # Business logic
│   ├── utils/              # Utilities and helpers
│   └── main.py            # Application entry point
├── src/                    # React frontend
│   ├── components/        # UI components
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Client libraries
├── database/              # Database schema
│   └── init.sql          # Initial database setup
├── docker-compose.yml    # Docker services configuration
└── LOCAL_SETUP.md       # Detailed setup guide

```

## Development

### Backend Development

```bash
cd backend
source venv/bin/activate
python3 main.py
```

API documentation available at: http://localhost:8000/docs

### Frontend Development

```bash
npm run dev
```

Application available at: http://localhost:5173

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
