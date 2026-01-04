# Docker Deployment Guide

This guide explains how to run the entire RCA Platform using Docker containers on your own server.

## Overview

The application runs as 4 Docker containers:
- **PostgreSQL** - Database
- **MinIO** - Object storage
- **FastAPI Backend** - Python API server
- **Nginx + React Frontend** - Web interface

All containers run on a single Docker network and communicate with each other.

## Prerequisites

You only need:
1. **Docker** (version 20.10+)
2. **Docker Compose** (version 2.0+)
3. **OpenAI API Key** (for AI features)

No need to install Python, Node.js, PostgreSQL, or any other dependencies!

## Quick Start

### 1. Clone or Download the Project

```bash
cd /path/to/rca-platform
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```bash
OPENAI_API_KEY=sk-your-actual-openai-key-here
JWT_SECRET_KEY=change-this-to-a-random-secret-in-production
```

### 3. Start Everything

```bash
./start.sh
```

That's it! The script will:
- Build all Docker images
- Start all containers
- Initialize the database
- Set up MinIO storage

### 4. Access the Application

- **Web App**: http://localhost
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MinIO Console**: http://localhost:9001

### 5. Login

Default credentials:
- **Email**: `admin@example.com`
- **Password**: `admin123`

## Architecture

```
┌─────────────────────────────────────────────┐
│         Docker Network: rca_network         │
│                                             │
│  ┌──────────────┐      ┌──────────────┐   │
│  │   Frontend   │──────│   Backend    │   │
│  │   (Nginx)    │      │  (FastAPI)   │   │
│  │   Port 80    │      │  Port 8000   │   │
│  └──────────────┘      └──────┬───────┘   │
│                               │            │
│                   ┌───────────┴────────┐  │
│                   │                    │  │
│           ┌───────▼─────┐     ┌───────▼────┐
│           │  PostgreSQL │     │    MinIO   │
│           │  Port 5432  │     │  Port 9000 │
│           └─────────────┘     └────────────┘
│                                             │
└─────────────────────────────────────────────┘
```

## Container Details

### Frontend Container
- **Base**: nginx:alpine
- **Port**: 80
- **Purpose**: Serves React app and proxies API requests to backend
- **Image Size**: ~50 MB

### Backend Container
- **Base**: python:3.11-slim
- **Port**: 8000
- **Purpose**: FastAPI server with Tesseract OCR
- **Image Size**: ~500 MB

### PostgreSQL Container
- **Base**: postgres:15-alpine
- **Port**: 5432
- **Database**: `rca_database`
- **User**: `rca_user`
- **Volume**: `postgres_data`

### MinIO Container
- **Base**: minio/minio:latest
- **Ports**: 9000 (API), 9001 (Console)
- **Credentials**: minioadmin / minioadmin123
- **Volume**: `minio_data`

## Common Commands

### View Logs

All services:
```bash
docker-compose logs -f
```

Specific service:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f minio
```

### Restart Services

All services:
```bash
docker-compose restart
```

Specific service:
```bash
docker-compose restart backend
```

### Stop All Services

```bash
./stop.sh
# or
docker-compose down
```

### Stop and Remove All Data

**Warning**: This deletes the database and all uploaded files!
```bash
docker-compose down -v
```

### Rebuild Containers

After code changes:
```bash
docker-compose up --build -d
```

### Check Container Status

```bash
docker-compose ps
```

### Execute Commands in Containers

Backend shell:
```bash
docker exec -it rca_backend /bin/bash
```

Database shell:
```bash
docker exec -it rca_postgres psql -U rca_user -d rca_database
```

## Data Persistence

Data is stored in Docker volumes:
- `postgres_data` - Database data
- `minio_data` - Uploaded documents

These volumes persist even when containers stop, so your data is safe.

### Backup Data

Backup database:
```bash
docker exec rca_postgres pg_dump -U rca_user rca_database > backup.sql
```

Restore database:
```bash
cat backup.sql | docker exec -i rca_postgres psql -U rca_user -d rca_database
```

Backup MinIO data:
```bash
docker exec rca_minio mc mirror /data ./minio-backup
```

## Port Configuration

If ports are already in use, edit `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # Change 8080 to your preferred port

  backend:
    ports:
      - "8001:8000"  # Change 8001 to your preferred port

  postgres:
    ports:
      - "5433:5432"  # Change 5433 to your preferred port
```

## Environment Variables

All environment variables are configured in docker-compose.yml. You can override them in your `.env` file:

```bash
# Required
OPENAI_API_KEY=sk-your-key-here

# Optional (defaults provided)
JWT_SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://rca_user:rca_password@postgres:5432/rca_database
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
```

## Production Deployment

### 1. Change Default Passwords

Edit `docker-compose.yml`:

```yaml
postgres:
  environment:
    POSTGRES_PASSWORD: your-strong-password-here

minio:
  environment:
    MINIO_ROOT_USER: your-username
    MINIO_ROOT_PASSWORD: your-strong-password
```

Update backend environment accordingly.

### 2. Set Strong JWT Secret

```bash
# Generate a secure secret
openssl rand -hex 32
```

Add to `.env`:
```bash
JWT_SECRET_KEY=your-generated-secret-here
```

### 3. Enable HTTPS

Use a reverse proxy like Nginx or Caddy in front of Docker:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Set Up Backups

Create a cron job for automatic backups:

```bash
# Add to crontab -e
0 2 * * * docker exec rca_postgres pg_dump -U rca_user rca_database > /backup/rca_$(date +\%Y\%m\%d).sql
```

### 5. Resource Limits

Add resource constraints in `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 6. Restart Policy

Already configured with `restart: unless-stopped` for automatic recovery.

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker-compose logs <service-name>
```

### Port Already in Use

Change port in `docker-compose.yml` or stop the conflicting service.

### Database Connection Failed

1. Check if PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify connection from backend:
   ```bash
   docker exec -it rca_backend python -c "from utils.database import Database; import asyncio; asyncio.run(Database.connect())"
   ```

### File Upload Fails

1. Check MinIO is running:
   ```bash
   docker-compose ps minio
   ```

2. Access MinIO console: http://localhost:9001
3. Check bucket exists: `rca-documents`

### Frontend Shows 502 Bad Gateway

Backend might not be ready yet. Wait 30 seconds and refresh.

Check backend health:
```bash
curl http://localhost:8000/health
```

### Out of Disk Space

Check Docker disk usage:
```bash
docker system df
```

Clean up unused resources:
```bash
docker system prune -a
```

## Updating the Application

1. Pull latest code:
   ```bash
   git pull
   ```

2. Rebuild and restart:
   ```bash
   docker-compose up --build -d
   ```

3. Check if everything is running:
   ```bash
   docker-compose ps
   ```

## Scaling

### Run Multiple Backend Instances

```yaml
backend:
  deploy:
    replicas: 3
```

Then add a load balancer in front.

### External Database

Instead of containerized PostgreSQL, use an external database:

```yaml
backend:
  environment:
    DATABASE_URL: postgresql://user:pass@external-host:5432/dbname
```

Remove the `postgres` service from docker-compose.yml.

## Security Best Practices

1. ✅ Change all default passwords
2. ✅ Use strong JWT secret
3. ✅ Enable HTTPS
4. ✅ Regular backups
5. ✅ Keep Docker images updated
6. ✅ Limit network exposure
7. ✅ Use environment variables for secrets
8. ✅ Regular security updates

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment: `.env` file is correct
3. Check GitHub issues
4. Review this documentation

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MinIO Documentation](https://min.io/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
