# Quick Start Guide

Get the RCA Platform running on your server in 3 steps!

## Prerequisites

1. **Docker** installed on your server
2. **OpenAI API Key** for AI features

## Installation Steps

### Step 1: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```bash
OPENAI_API_KEY=sk-your-actual-key-here
JWT_SECRET_KEY=change-this-in-production
```

### Step 2: Start Everything

```bash
./start.sh
```

The script will automatically:
- Build all Docker images
- Start all containers (PostgreSQL, MinIO, Backend, Frontend)
- Initialize the database with default admin user
- Configure storage

This takes 2-5 minutes on first run.

### Step 3: Access the Application

Open your browser and go to:
- **Application**: http://localhost
- **API Docs**: http://localhost:8000/docs

Login with:
- **Email**: `admin@example.com`
- **Password**: `admin123`

## That's It!

You now have a fully functional RCA Platform running on your server.

## Next Steps

1. **Change the admin password** in the application
2. **Create additional user accounts** as needed
3. **Start creating incidents** and uploading documents
4. **Run AI analysis** on your incidents

## Common Commands

```bash
# View logs
docker-compose logs -f

# Stop everything
./stop.sh

# Restart services
docker-compose restart

# Update application
git pull
docker-compose up --build -d
```

## What's Running?

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| Frontend | rca_frontend | 80 | Web interface |
| Backend | rca_backend | 8000 | API server |
| PostgreSQL | rca_postgres | 5432 | Database |
| MinIO | rca_minio | 9000, 9001 | File storage |

## Need Help?

- **Full Documentation**: See [DOCKER_SETUP.md](DOCKER_SETUP.md)
- **Troubleshooting**: Check container logs with `docker-compose logs`
- **Issues**: Review error messages in the logs

## Architecture

```
Your Server
    │
    ├─ Frontend (React + Nginx) → Port 80
    │
    ├─ Backend (FastAPI + Python) → Port 8000
    │     ├─ Connects to PostgreSQL
    │     ├─ Connects to MinIO
    │     └─ Calls OpenAI API
    │
    ├─ PostgreSQL Database → Port 5432
    │     └─ Stores all application data
    │
    └─ MinIO Storage → Port 9000
          └─ Stores uploaded documents
```

## Security Notes

For production deployment:

1. Change default database password in `docker-compose.yml`
2. Change MinIO credentials in `docker-compose.yml`
3. Use a strong JWT secret in `.env`
4. Set up HTTPS with a reverse proxy
5. Enable firewall rules
6. Set up automated backups

See [DOCKER_SETUP.md](DOCKER_SETUP.md) for production deployment details.
