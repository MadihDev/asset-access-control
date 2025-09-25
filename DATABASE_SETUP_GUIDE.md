# Complete Database Setup Guide - From Zero to Production Ready

This guide will walk you through setting up the PostgreSQL database for the RFID Asset Access Control System from scratch, including all configurations, security settings, and best practices.

## Your Current Configuration

- **PostgreSQL Version**: 17.6
- **Database User**: postgres
- **Password**: root
- **Port**: 5433
- **Database Name**: rfid_access_control

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [PostgreSQL Installation](#postgresql-installation)
3. [Database Configuration](#database-configuration)
4. [Environment Setup](#environment-setup)
5. [Docker Setup (Recommended)](#docker-setup-recommended)
6. [Prisma Configuration](#prisma-configuration)
7. [Database Migration & Seeding](#database-migration--seeding)
8. [Security Configuration](#security-configuration)
9. [Performance Optimization](#performance-optimization)
10. [Backup & Recovery Setup](#backup--recovery-setup)
11. [Monitoring & Maintenance](#monitoring--maintenance)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **OS**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 10GB free space
- **Network**: Internet connection for downloads

### Required Software

- [ ] **Node.js** (v18.0.0 or higher)
- [ ] **npm** or **yarn** package manager
- [ ] **Docker Desktop** (recommended) or PostgreSQL standalone
- [ ] **Git** for version control

---

## PostgreSQL Installation

### Option A: Docker Setup (Recommended for Development)

#### Step 1: Install Docker Desktop

1. Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)
2. Install and start Docker Desktop
3. Verify installation:
   ```bash
   docker --version
   docker-compose --version
   ```

#### Step 2: Use Project's Docker Compose

The project includes a pre-configured `docker-compose.yml` file:

```yaml
# Verify docker-compose.yml contains:
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: rfid_access_control
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: root
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Option B: Standalone PostgreSQL Installation

#### Windows Installation

1. Download PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run the installer with these settings:
   - **Port**: 5433 (your custom port)
   - **Superuser Password**: root
   - **Locale**: Default
3. Add PostgreSQL to system PATH
4. Verify installation:
   ```cmd
   psql --version
   ```

#### macOS Installation

```bash
# Using Homebrew (recommended)
brew install postgresql@17
brew services start postgresql@17

# Or download from postgresql.org
```

#### Linux Installation (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

---

## Database Configuration

### Step 1: Create Database and User

#### Using Docker (Skip if using docker-compose.yml)

```bash
# Start PostgreSQL container
docker run --name rfid-postgres \
  -e POSTGRES_DB=rfid_access_control \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=root \
  -p 5433:5432 \
  -d postgres:17
```

#### Using Standalone PostgreSQL

```bash
# Connect as superuser
psql -U postgres -p 5433

# Create database
CREATE DATABASE rfid_access_control;

# The postgres user already exists with your password 'root'
# You can also create a separate application user if desired:
# CREATE USER rfid_user WITH ENCRYPTED PASSWORD 'your_secure_password';
# GRANT ALL PRIVILEGES ON DATABASE rfid_access_control TO rfid_user;

# Exit psql
\q
```

### Step 2: Configure PostgreSQL Settings

#### Edit postgresql.conf

```bash
# Find config file location
psql -U postgres -p 5433 -c 'SHOW config_file;'

# Edit the file (example path for Windows)
# notepad "C:\Program Files\PostgreSQL\17\data\postgresql.conf"
# For Linux/macOS:
# sudo nano /etc/postgresql/17/main/postgresql.conf
```

#### Recommended Settings

```conf
# Connection Settings
listen_addresses = 'localhost'          # Accept connections
port = 5433                             # Your custom port
max_connections = 100                   # Adjust based on needs

# Memory Settings
shared_buffers = 256MB                  # 25% of RAM (for 1GB system)
effective_cache_size = 1GB              # 75% of available RAM
work_mem = 4MB                          # Memory for sort operations
maintenance_work_mem = 64MB             # Memory for maintenance

# Write-Ahead Logging (WAL)
wal_level = replica                     # Enable replication
max_wal_size = 1GB                      # WAL size limit
min_wal_size = 80MB                     # Minimum WAL size

# Logging
log_destination = 'stderr'              # Log to stderr
logging_collector = on                  # Enable log collection
log_directory = 'log'                   # Log directory
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_min_messages = warning              # Log level
log_min_error_statement = error         # Error statement logging
log_connections = on                    # Log connections
log_disconnections = on                 # Log disconnections
log_statement = 'mod'                   # Log modifications

# Performance
checkpoint_completion_target = 0.7      # Checkpoint target
random_page_cost = 1.1                  # SSD optimization
effective_io_concurrency = 200          # SSD optimization
```

#### Edit pg_hba.conf (Authentication)

```bash
# For Windows: Edit pg_hba.conf file
# notepad "C:\Program Files\PostgreSQL\17\data\pg_hba.conf"
# For Linux/macOS:
# sudo nano /etc/postgresql/17/main/pg_hba.conf
```

Add these lines:

```conf
# TYPE  DATABASE                USER            ADDRESS                 METHOD
local   rfid_access_control     postgres                                md5
host    rfid_access_control     postgres        127.0.0.1/32           md5
host    rfid_access_control     postgres        ::1/128                md5
```

#### Restart PostgreSQL

```bash
# Windows - restart PostgreSQL service
net stop postgresql-x64-17
net start postgresql-x64-17

# Ubuntu/Debian
sudo systemctl restart postgresql

# macOS (Homebrew)
brew services restart postgresql@17

# Docker
docker restart rfid-postgres
```

---

## Environment Setup

### Step 1: Create Environment Files

#### Backend Environment (.env)

```bash
cd backend
cp .env.example .env
```

Edit `.env` file:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:root@localhost:5433/rfid_access_control?schema=public"

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRE=1h
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-minimum-32-characters
REFRESH_TOKEN_EXPIRE=7d

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Twilio Configuration (Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Development Features
ENABLE_SIM_ROUTES=true
LOG_LEVEL=info
```

#### Frontend Environment (.env)

```bash
cd rfid-frontend
cp .env.example .env
```

Edit `.env` file:

```env
# API Configuration
VITE_API_URL=http://localhost:5000

# App Configuration
VITE_APP_NAME="RFID Access Control"
VITE_APP_VERSION=1.0.0

# Development Configuration
VITE_DEBUG=true
```

### Step 2: Validate Environment Variables

```bash
# Backend validation
cd backend
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');"

# Test database connection
node -e "
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.error('Database connection failed:', err))
  .finally(() => prisma.\$disconnect());
"
```

---

## Docker Setup (Recommended)

### Step 1: Start Database with Docker Compose

```bash
# From project root
docker-compose up -d db

# Verify database is running
docker-compose ps
docker logs asset-access-control_db_1
```

### Step 2: Test Database Connection

```bash
# Connect to database
docker exec -it asset-access-control_db_1 psql -U postgres -d rfid_access_control

# Test basic operations
\l                          # List databases
\dt                         # List tables (should be empty initially)
\q                          # Quit
```

### Step 3: Configure Docker for Production

Create `docker-compose.prod.yml`:

```yaml
version: "3.8"
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: rfid_access_control
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgresql.conf:/etc/postgresql/postgresql.conf
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    restart: unless-stopped
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt

volumes:
  postgres_data:
```

---

## Prisma Configuration

### Step 1: Install Dependencies

```bash
cd backend
npm install
npm install @prisma/client prisma
```

### Step 2: Generate Prisma Client

```bash
npx prisma generate
```

### Step 3: Validate Schema

```bash
# Check schema syntax
npx prisma validate

# Format schema
npx prisma format
```

### Step 4: Database Introspection (If Database Exists)

```bash
# Pull existing database schema
npx prisma db pull

# Generate client from pulled schema
npx prisma generate
```

---

## Database Migration & Seeding

### Step 1: Create Initial Migration

```bash
cd backend

# Reset database (if needed)
npx prisma migrate reset --force

# Create and apply initial migration
npx prisma migrate dev --name init

# Verify migration
npx prisma migrate status
```

### Step 2: Seed Database with Initial Data

```bash
# Run seed script
npm run db:seed

# Verify seed data
npx prisma studio
# Open http://localhost:5555 to view data
```

### Step 3: Validate Database Structure

```bash
# Connect to database and verify structure
docker exec -it asset-access-control_db_1 psql -U postgres -d rfid_access_control

# Check tables
\dt

# Check specific table structure
\d "User"
\d "Project"
\d "City"
\d "ProjectCity"

# Check data
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Project";
SELECT COUNT(*) FROM "City";
SELECT COUNT(*) FROM "ProjectCity";

# Exit
\q
```

### Expected Database Structure

After successful setup, you should have these tables:

- [ ] **User** - User accounts and authentication
- [ ] **Project** - Project definitions
- [ ] **City** - City definitions
- [ ] **ProjectCity** - Project-City relationships
- [ ] **Location** - Physical locations
- [ ] **Lock** - RFID lock devices
- [ ] **RfidCard** - RFID cards
- [ ] **AccessKey** - Access permissions
- [ ] **AccessLog** - Access history
- [ ] **AuditLog** - System audit trail
- [ ] **RefreshToken** - JWT refresh tokens

---

## Security Configuration

### Step 1: Database Security

```sql
-- Connect as superuser
psql -U postgres -p 5433

-- Revoke public access
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Grant specific permissions to postgres user (already has them)
GRANT USAGE ON SCHEMA public TO postgres;
GRANT CREATE ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
```

### Step 2: SSL Configuration (Production)

```bash
# Generate SSL certificates
openssl req -new -text -out server.req -keyout server.key -nodes
openssl rsa -in server.key -out server.key
openssl req -x509 -in server.req -text -key server.key -out server.crt

# Move certificates to PostgreSQL data directory
# Windows:
copy server.crt server.key "C:\Program Files\PostgreSQL\17\data\"
# Linux/macOS:
sudo cp server.crt server.key /var/lib/postgresql/17/main/

# Set permissions (Windows - in Administrator Command Prompt)
icacls "C:\Program Files\PostgreSQL\17\data\server.key" /grant postgres:R
icacls "C:\Program Files\PostgreSQL\17\data\server.crt" /grant postgres:R
# Linux/macOS:
sudo chown postgres:postgres /var/lib/postgresql/17/main/server.*
sudo chmod 600 /var/lib/postgresql/17/main/server.key
sudo chmod 644 /var/lib/postgresql/17/main/server.crt
```

Edit `postgresql.conf`:

```conf
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on
```

Update connection string for SSL:

```env
DATABASE_URL="postgresql://postgres:root@localhost:5433/rfid_access_control?schema=public&sslmode=require"
```

### Step 3: Firewall Configuration

```bash
# Ubuntu/Debian - UFW
sudo ufw allow from 127.0.0.1 to any port 5433
sudo ufw allow from YOUR_APP_SERVER_IP to any port 5433

# CentOS/RHEL - Firewalld
sudo firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='127.0.0.1' port protocol='tcp' port='5433' accept"
sudo firewall-cmd --reload
```

---

## Performance Optimization

### Step 1: Create Indexes

```sql
-- Connect to database
psql -U postgres -p 5433 -d rfid_access_control

-- Create performance indexes
CREATE INDEX CONCURRENTLY idx_user_email ON "User"(email);
CREATE INDEX CONCURRENTLY idx_user_project_city ON "User"("projectId", "cityId");
CREATE INDEX CONCURRENTLY idx_accesslog_timestamp ON "AccessLog"("timestamp");
CREATE INDEX CONCURRENTLY idx_accesslog_user_timestamp ON "AccessLog"("userId", "timestamp");
CREATE INDEX CONCURRENTLY idx_accesskey_active ON "AccessKey"("isActive");
CREATE INDEX CONCURRENTLY idx_location_project_city ON "Location"("projectId", "cityId");
CREATE INDEX CONCURRENTLY idx_rfidcard_active ON "RfidCard"("isActive");

-- Verify indexes
\di
```

### Step 2: Update Table Statistics

```sql
-- Analyze tables for query optimization
ANALYZE "User";
ANALYZE "Project";
ANALYZE "City";
ANALYZE "Location";
ANALYZE "AccessLog";
ANALYZE "AccessKey";
```

### Step 3: Configure Connection Pooling

Install and configure PgBouncer (optional but recommended for production):

```bash
# Ubuntu/Debian
sudo apt install pgbouncer

# Create configuration
sudo nano /etc/pgbouncer/pgbouncer.ini
```

PgBouncer configuration:

```ini
[databases]
rfid_access_control = host=localhost port=5433 dbname=rfid_access_control

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

---

## Backup & Recovery Setup

### Step 1: Automated Backup Script

Create `backup-database.sh`:

```bash
#!/bin/bash

# Configuration
DB_NAME="rfid_access_control"
DB_USER="postgres"
DB_PORT="5433"
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_$DATE.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U $DB_USER -h localhost -p $DB_PORT -d $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Remove backups older than 7 days
find $BACKUP_DIR -name "${DB_NAME}_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

### Step 2: Setup Cron Job

```bash
# Make script executable
chmod +x backup-database.sh

# Add to crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-database.sh
```

### Step 3: Test Backup and Recovery

```bash
# Test backup
./backup-database.sh

# Test recovery
createdb -p 5433 rfid_access_control_test
gunzip -c /var/backups/postgresql/rfid_access_control_backup_YYYYMMDD_HHMMSS.sql.gz | psql -U postgres -p 5433 -d rfid_access_control_test
```

---

## Monitoring & Maintenance

### Step 1: Enable Query Logging

Edit `postgresql.conf`:

```conf
# Log slow queries
log_min_duration_statement = 1000  # Log queries taking >1 second
log_statement = 'mod'               # Log all modifications
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

### Step 2: Regular Maintenance Tasks

Create `maintenance.sh`:

```bash
#!/bin/bash

# Database maintenance script
DB_NAME="rfid_access_control"
DB_USER="postgres"
DB_PORT="5433"

echo "Starting database maintenance..."

# Update statistics
psql -U $DB_USER -p $DB_PORT -d $DB_NAME -c "ANALYZE;"

# Vacuum tables
psql -U $DB_USER -p $DB_PORT -d $DB_NAME -c "VACUUM ANALYZE;"

# Reindex tables
psql -U $DB_USER -p $DB_PORT -d $DB_NAME -c "REINDEX DATABASE $DB_NAME;"

echo "Database maintenance completed."
```

### Step 3: Monitoring Queries

```sql
-- Check active connections
SELECT * FROM pg_stat_activity WHERE datname = 'rfid_access_control';

-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Connection Refused

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check port
netstat -an | grep 5433

# Check configuration
psql -U postgres -p 5433 -c "SHOW listen_addresses;"
```

#### 2. Authentication Failed

```bash
# Reset password
psql -U postgres -p 5433
ALTER USER postgres PASSWORD 'root';

# Check pg_hba.conf (Windows)
notepad "C:\Program Files\PostgreSQL\17\data\pg_hba.conf"
# For Linux/macOS:
# sudo nano /etc/postgresql/17/main/pg_hba.conf
```

#### 3. Database Does Not Exist

```bash
# Create database
createdb -U postgres -p 5433 rfid_access_control

# Or via psql
psql -U postgres -p 5433
CREATE DATABASE rfid_access_control;
```

#### 4. Permission Denied

```sql
-- Grant permissions (postgres user already has all privileges)
GRANT ALL PRIVILEGES ON DATABASE rfid_access_control TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

#### 5. Prisma Migration Issues

```bash
# Reset migrations
npx prisma migrate reset

# Force push schema
npx prisma db push --force-reset

# Regenerate client
npx prisma generate
```

#### 6. Docker Issues

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs db

# Restart container
docker-compose restart db

# Reset everything
docker-compose down -v
docker-compose up -d db
```

### Diagnostic Commands

```bash
# Test database connection
psql -U postgres -h localhost -p 5433 -d rfid_access_control -c "SELECT version();"

# Check Prisma connection
cd backend
npx prisma studio

# Test backend API
curl http://localhost:5000/api/health

# Check environment variables
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL);"
```

---

## Verification Checklist

After completing the setup, verify everything is working:

### Database Verification

- [ ] PostgreSQL server is running
- [ ] Database `rfid_access_control` exists
- [ ] User `rfid_user` can connect
- [ ] All tables are created
- [ ] Seed data is loaded
- [ ] Indexes are created
- [ ] SSL is configured (production)

### Application Verification

- [ ] Backend starts without errors
- [ ] Prisma client connects successfully
- [ ] Migrations run successfully
- [ ] API endpoints respond correctly
- [ ] Frontend connects to backend
- [ ] Login system works
- [ ] Multi-tenant data is accessible

### Security Verification

- [ ] Strong passwords are set
- [ ] Database user has minimal required permissions
- [ ] SSL encryption is enabled (production)
- [ ] Firewall rules are configured
- [ ] Backup system is working
- [ ] Logs are being written

### Performance Verification

- [ ] Indexes are in place
- [ ] Query performance is acceptable
- [ ] Connection pooling is configured
- [ ] Monitoring is set up

---

## Final Notes

### Production Considerations

1. **Always use SSL** in production environments
2. **Regular backups** are essential
3. **Monitor performance** and optimize queries
4. **Keep PostgreSQL updated** for security patches
5. **Use connection pooling** for high-traffic applications
6. **Implement proper monitoring** and alerting

### Development Tips

1. Use **Docker Compose** for consistent environments
2. Keep **environment files** secure and never commit them
3. Use **Prisma Studio** for database exploration
4. **Test migrations** in development before production
5. **Monitor logs** for optimization opportunities

### Support Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**This guide covers everything needed for a complete database setup. Follow each section carefully and verify each step before proceeding to the next.**
