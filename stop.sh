#!/bin/bash

echo "🛑 Stopping RCA Platform Services"
echo ""

echo "📦 Stopping Docker services..."
docker-compose down

echo ""
echo "✅ All services stopped"
echo ""
echo "💡 To remove all data (including database and uploaded files):"
echo "   docker-compose down -v"
