#!/bin/bash

set -e

echo "🚀 Starting RCA Platform Local Setup"
echo ""

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker is installed"

echo ""
echo "📦 Starting Docker services (PostgreSQL + MinIO)..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

if ! docker-compose ps | grep -q "rca_postgres.*Up"; then
    echo "❌ PostgreSQL failed to start"
    docker-compose logs postgres
    exit 1
fi

if ! docker-compose ps | grep -q "rca_minio.*Up"; then
    echo "❌ MinIO failed to start"
    docker-compose logs minio
    exit 1
fi

echo "✅ PostgreSQL is running on port 5432"
echo "✅ MinIO is running on port 9000"

echo ""
echo "📝 Setup Instructions:"
echo ""
echo "1. Backend Setup:"
echo "   cd backend"
echo "   cp .env.example .env"
echo "   # Edit .env and add your OPENAI_API_KEY"
echo "   python3 -m venv venv"
echo "   source venv/bin/activate"
echo "   pip install -r requirements.txt"
echo "   python3 main.py"
echo ""
echo "2. Frontend Setup (in a new terminal):"
echo "   npm install"
echo "   npm run dev"
echo ""
echo "3. Access the application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo "   MinIO Console: http://localhost:9001"
echo ""
echo "4. Default login:"
echo "   Email: admin@example.com"
echo "   Password: admin123"
echo ""
echo "📖 For detailed instructions, see LOCAL_SETUP.md"
