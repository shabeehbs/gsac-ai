# Migration to Local Self-Hosted Setup

This document explains the changes made to enable local, self-hosted deployment of the RCA Platform.

## What Changed?

### Architecture Changes

**Before (Cloud-Based):**
- Supabase PostgreSQL (cloud)
- Supabase Storage (cloud)
- Supabase Auth (cloud)
- Required internet connection to Supabase

**After (Local Self-Hosted):**
- PostgreSQL 15 (Docker container)
- MinIO S3-compatible storage (Docker container)
- JWT-based authentication (self-managed)
- Can run entirely offline (except OpenAI API calls)

### New Files Added

1. **docker-compose.yml** - Docker services configuration
2. **database/init.sql** - Database schema initialization
3. **backend/utils/database.py** - PostgreSQL connection pooling
4. **backend/utils/storage.py** - MinIO storage client
5. **backend/utils/auth.py** - JWT authentication utilities
6. **backend/routers/auth.py** - Login/register endpoints
7. **LOCAL_SETUP.md** - Comprehensive setup guide
8. **start.sh** - Quick start script
9. **stop.sh** - Shutdown script
10. **.env.local** - Frontend environment template

### Modified Files

1. **backend/requirements.txt**
   - Removed: `supabase`
   - Added: `psycopg2-binary`, `passlib`, `bcrypt`, `python-jose`, `minio`

2. **backend/main.py**
   - Changed database connection to use new Database class
   - Added auth router

3. **backend/.env.example**
   - Updated with local PostgreSQL and MinIO configuration
   - Added JWT_SECRET_KEY

4. **.gitignore**
   - Added Python cache files and backend .env

## Database Schema Differences

### Removed Supabase-Specific Features

1. **Row Level Security (RLS)**: Removed all RLS policies
   - Security now handled at application level

2. **auth.uid()**: No longer available
   - Replaced with JWT-based user identification

3. **Supabase Auth Integration**: Removed
   - Replaced with custom JWT authentication

### New Features

1. **Users Table**: Self-managed user accounts with password hashing
2. **Automatic Timestamps**: Using PostgreSQL triggers
3. **Foreign Key Constraints**: Proper relational integrity
4. **Indexes**: Optimized for common queries

## Authentication Changes

### Old (Supabase Auth)
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})
```

### New (JWT Auth)
```typescript
const response = await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})
const { access_token, user } = await response.json()
```

## Storage Changes

### Old (Supabase Storage)
```python
supabase.storage.from_("bucket").upload(path, file)
```

### New (MinIO)
```python
StorageClient.upload_file(file_data, path, content_type)
```

## Environment Variables Comparison

### Old (.env)
```bash
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
OPENAI_API_KEY=sk-xxx
```

### New (.env)
```bash
DATABASE_URL=postgresql://rca_user:rca_password@localhost:5432/rca_database
OPENAI_API_KEY=sk-xxx
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_SECURE=false
JWT_SECRET_KEY=your-secret-key
```

## Migration Steps for Existing Data

If you have existing data in Supabase and want to migrate it locally:

### 1. Export Data from Supabase

```sql
-- Connect to your Supabase database and export data
COPY (SELECT * FROM incidents) TO '/tmp/incidents.csv' WITH CSV HEADER;
COPY (SELECT * FROM documents) TO '/tmp/documents.csv' WITH CSV HEADER;
COPY (SELECT * FROM ai_analysis) TO '/tmp/ai_analysis.csv' WITH CSV HEADER;
COPY (SELECT * FROM rca_reports) TO '/tmp/rca_reports.csv' WITH CSV HEADER;
COPY (SELECT * FROM human_reviews) TO '/tmp/human_reviews.csv' WITH CSV HEADER;
```

### 2. Create Users

Since the local version uses a different auth system, you'll need to create users manually:

```sql
-- Connect to local PostgreSQL
docker exec -it rca_postgres psql -U rca_user -d rca_database

-- Create users (note: passwords will need to be reset)
INSERT INTO users (id, email, full_name)
VALUES ('user-uuid-here', 'user@example.com', 'User Name');
```

### 3. Import Data

```bash
# Copy CSV files into Docker container
docker cp incidents.csv rca_postgres:/tmp/

# Import data
docker exec -it rca_postgres psql -U rca_user -d rca_database \
  -c "\COPY incidents FROM '/tmp/incidents.csv' WITH CSV HEADER"
```

### 4. Migrate Storage Files

Download files from Supabase Storage and upload them to MinIO using the MinIO console or CLI.

## API Endpoint Changes

### New Auth Endpoints

- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Authentication Header

All protected endpoints now require:
```
Authorization: Bearer <jwt_token>
```

## Benefits of Local Deployment

1. **No Cloud Dependencies**: Run entirely on your own infrastructure
2. **Cost Savings**: No monthly Supabase fees
3. **Data Privacy**: All data stays on your servers
4. **Offline Capable**: Works without internet (except OpenAI API)
5. **Full Control**: Customize database, storage, and authentication
6. **No Vendor Lock-in**: Standard PostgreSQL and S3-compatible storage

## Limitations

1. **Manual User Management**: No built-in user management UI (yet)
2. **Basic Authentication**: Simple JWT auth without advanced features like MFA
3. **Self-Managed Backups**: You're responsible for database backups
4. **No Real-time Subscriptions**: No built-in real-time database updates
5. **Requires OpenAI API**: Still needs internet for AI analysis

## Production Considerations

1. **Security**:
   - Change all default passwords
   - Use strong JWT secret key
   - Enable HTTPS with reverse proxy
   - Regular security updates

2. **Backups**:
   - Set up automated PostgreSQL backups
   - Backup MinIO data regularly
   - Test restore procedures

3. **Monitoring**:
   - Monitor Docker container health
   - Set up logging aggregation
   - Monitor disk space usage

4. **Scaling**:
   - Consider PostgreSQL replication for high availability
   - Use load balancer for multiple backend instances
   - Scale MinIO with distributed mode

## Support

For issues with local deployment, check:
1. Docker container logs: `docker-compose logs`
2. Backend logs: Terminal running `python3 main.py`
3. Frontend logs: Browser console
4. Database: Connect with `docker exec -it rca_postgres psql -U rca_user -d rca_database`

## Reverting to Cloud Setup

If you need to switch back to Supabase:
1. Keep the old branch/commit with Supabase integration
2. Restore `supabase` package in requirements.txt
3. Restore original database and storage client files
4. Update .env with Supabase credentials
