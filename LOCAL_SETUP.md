# Local Self-Hosted Setup Guide

This guide explains how to run the RCA Platform entirely on your own server using Docker and local PostgreSQL.

## Prerequisites

Before you begin, make sure you have the following installed:

1. **Docker** and **Docker Compose**
   - [Install Docker](https://docs.docker.com/get-docker/)
   - [Install Docker Compose](https://docs.docker.com/compose/install/)

2. **Python 3.9+**
   ```bash
   python3 --version
   ```

3. **Tesseract OCR** (for document text extraction)
   ```bash
   # Ubuntu/Debian
   sudo apt-get install tesseract-ocr

   # macOS
   brew install tesseract

   # Windows - Download installer from:
   # https://github.com/UB-Mannheim/tesseract/wiki
   ```

4. **Node.js 16+** and **npm** (for frontend)
   ```bash
   node --version
   npm --version
   ```

## Architecture Overview

The local setup includes:
- **PostgreSQL 15**: Database for storing incidents, documents, and reports
- **MinIO**: S3-compatible object storage for document files
- **FastAPI Backend**: Python API server
- **React Frontend**: Web application interface

## Step 1: Start Docker Services

Start PostgreSQL and MinIO using Docker Compose:

```bash
# From the project root directory
docker-compose up -d
```

This will start:
- PostgreSQL on port **5432**
- MinIO on port **9000** (API) and **9001** (Console)

Verify the services are running:
```bash
docker-compose ps
```

You should see both `rca_postgres` and `rca_minio` containers running.

### Access MinIO Console

You can access the MinIO web console at: http://localhost:9001

- Username: `minioadmin`
- Password: `minioadmin123`

## Step 2: Configure Backend Environment

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your OpenAI API key:
   ```bash
   DATABASE_URL=postgresql://rca_user:rca_password@localhost:5432/rca_database
   OPENAI_API_KEY=sk-your-openai-api-key-here
   PORT=8000

   MINIO_ENDPOINT=localhost:9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin123
   MINIO_SECURE=false

   JWT_SECRET_KEY=your-secret-key-change-this-in-production
   ```

   **Important**: Change `JWT_SECRET_KEY` to a random secure string in production.

## Step 3: Install Backend Dependencies

1. Create a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install Python packages:
   ```bash
   pip install -r requirements.txt
   ```

## Step 4: Start Backend Server

Run the FastAPI backend:

```bash
python3 main.py
```

The backend API will be available at: http://localhost:8000

You can view the API documentation at: http://localhost:8000/docs

## Step 5: Configure and Start Frontend

1. Open a new terminal and navigate to the project root

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the project root:
   ```bash
   VITE_API_URL=http://localhost:8000/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at: http://localhost:5173

## Step 6: Login to the Application

The database is initialized with a default admin account:

- **Email**: `admin@example.com`
- **Password**: `admin123`

You can create additional users through the registration page.

## Database Management

### View Database Contents

Connect to PostgreSQL using any database client:

```bash
docker exec -it rca_postgres psql -U rca_user -d rca_database
```

Common commands:
```sql
\dt              # List all tables
\d+ incidents    # Describe incidents table
SELECT * FROM users;
```

### Reset Database

To reset the database to its initial state:

```bash
docker-compose down -v  # This will delete all data
docker-compose up -d    # Restart with fresh database
```

## Troubleshooting

### Port Already in Use

If ports 5432 or 9000 are already in use, you can change them in `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"  # Change local port to 5433
```

Then update `DATABASE_URL` in `.env` accordingly.

### Cannot Connect to Database

1. Check if Docker containers are running:
   ```bash
   docker-compose ps
   ```

2. Check container logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify connection settings in `.env` match `docker-compose.yml`

### Document Upload Fails

1. Check MinIO is running:
   ```bash
   docker-compose ps minio
   ```

2. Verify MinIO settings in `.env`

3. Check MinIO logs:
   ```bash
   docker-compose logs minio
   ```

### Backend Errors

Check the backend console output for error messages. Common issues:

- **Missing OpenAI API key**: Add valid key to `.env`
- **Tesseract not found**: Install Tesseract OCR
- **Import errors**: Reinstall dependencies with `pip install -r requirements.txt`

## Production Deployment

For production deployment on your own server:

1. **Change default passwords** in `docker-compose.yml`:
   - PostgreSQL password
   - MinIO credentials

2. **Set strong JWT secret** in `.env`:
   ```bash
   JWT_SECRET_KEY=$(openssl rand -hex 32)
   ```

3. **Use environment-specific database URL** if deploying to a remote server

4. **Configure HTTPS** using a reverse proxy like Nginx or Caddy

5. **Set up backups** for PostgreSQL data:
   ```bash
   docker exec rca_postgres pg_dump -U rca_user rca_database > backup.sql
   ```

6. **Build frontend for production**:
   ```bash
   npm run build
   ```

## Stopping the Services

To stop all services:

```bash
# Stop backend (Ctrl+C in the terminal running main.py)

# Stop Docker services
docker-compose down

# To also remove volumes (deletes all data):
docker-compose down -v
```

## Data Persistence

All data is stored in Docker volumes:
- `postgres_data`: Database data
- `minio_data`: Uploaded documents

These volumes persist even when containers are stopped, so your data is safe unless you use `docker-compose down -v`.

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
