#!/bin/bash

set -e

echo "🚀 Starting RCA Platform (Fully Dockerized)"
echo ""

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker is installed"
echo ""

if [ ! -f .env ]; then
    echo "⚠️  No .env file found!"
    echo ""
    echo "Creating .env from template..."
    cp .env.example .env
    echo ""
    echo "📝 IMPORTANT: Edit the .env file and add your OpenAI API key:"
    echo "   OPENAI_API_KEY=sk-your-actual-api-key-here"
    echo ""
    echo "Then run this script again."
    exit 1
fi

if grep -q "sk-your-openai-api-key-here" .env; then
    echo "⚠️  Warning: You haven't set your OpenAI API key in .env"
    echo "   The application will start but AI features won't work."
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📦 Building and starting all Docker containers..."
echo "   This may take a few minutes on first run..."
echo ""

docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

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

if ! docker-compose ps | grep -q "rca_backend.*Up"; then
    echo "❌ Backend failed to start"
    docker-compose logs backend
    exit 1
fi

if ! docker-compose ps | grep -q "rca_frontend.*Up"; then
    echo "❌ Frontend failed to start"
    docker-compose logs frontend
    exit 1
fi

echo ""
echo "✅ All services are running!"
echo ""
echo "🌐 Access Points:"
echo "   📱 Application:      http://localhost"
echo "   🔧 Backend API:      http://localhost:8000"
echo "   📚 API Docs:         http://localhost:8000/docs"
echo "   🗄️  MinIO Console:    http://localhost:9001"
echo "   🐘 PostgreSQL:       localhost:5432"
echo ""
echo "🔐 Default Login:"
echo "   Email:    admin@example.com"
echo "   Password: admin123"
echo ""
echo "📊 Service Status:"
docker-compose ps
echo ""
echo "📖 Commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop all:      ./stop.sh"
echo "   Restart:       docker-compose restart"
echo ""
echo "✨ Ready to use!"
