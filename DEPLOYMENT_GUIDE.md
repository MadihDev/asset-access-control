# 🚀 **Asset Access Control System - Deployment Guide**

## 📋 **Overview**

This guide provides comprehensive instructions for deploying the Asset Access Control System in various environments, from development to production. The system consists of a Node.js backend, React frontend, and PostgreSQL database with multi-tenant architecture.

---

## 🏗️ **System Requirements**

### **Minimum Hardware Requirements**

**Development Environment:**

- CPU: 2 cores, 2.4 GHz
- RAM: 4 GB
- Storage: 10 GB available space
- Network: Broadband internet connection

**Production Environment:**

- CPU: 4 cores, 2.4 GHz or higher
- RAM: 8 GB (16 GB recommended)
- Storage: 50 GB SSD (100 GB recommended)
- Network: Dedicated network connection with SSL certificate

### **Software Requirements**

- **Node.js:** v18.0.0 or higher
- **npm:** v8.0.0 or higher
- **PostgreSQL:** v14.0 or higher
- **Git:** Latest version
- **Docker:** v20.0.0 or higher (optional)
- **Redis:** v6.0.0 or higher (for production caching)

---

## 🛠️ **Development Environment Setup**

### **1. Prerequisites Installation**

**Install Node.js and npm:**

```bash
# Download from https://nodejs.org/
# Verify installation
node --version
npm --version
```

**Install PostgreSQL:**

```bash
# Windows: Download from https://www.postgresql.org/download/windows/
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql postgresql-contrib

# Verify installation
psql --version
```

**Install Git:**

```bash
# Download from https://git-scm.com/downloads
git --version
```

### **2. Project Setup**

**Clone the Repository:**

```bash
git clone https://github.com/MadihDev/asset-access-control.git
cd asset-access-control
```

**Backend Setup:**

```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables (see Environment Configuration section)
nano .env
```

**Frontend Setup:**

```bash
cd ../rfid-frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### **3. Database Setup**

**Create Database:**

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database and user
CREATE DATABASE rfid_access_control;
CREATE USER rfid_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE rfid_access_control TO rfid_user;

-- Exit psql
\q
```

**Run Migrations and Seed Data:**

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed with demo data
npx prisma db seed
```

### **4. Environment Configuration**

**Backend Environment Variables (`.env`):**

```env
# Database Configuration
DATABASE_URL="postgresql://rfid_user:your_secure_password@localhost:5432/rfid_access_control?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secure-jwt-secret-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-key-min-32-chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server Configuration
PORT=5000
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
```

**Frontend Environment Variables (`.env`):**

```env
# API Configuration
VITE_API_BASE_URL="http://localhost:5000/api"

# Development
VITE_NODE_ENV="development"

# Feature Flags
VITE_ENABLE_DEBUG=true
```

### **5. Running the Development Server**

**Start Backend:**

```bash
cd backend
npm run dev
```

**Start Frontend (in new terminal):**

```bash
cd rfid-frontend
npm run dev
```

**Access the Application:**

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- API Health Check: http://localhost:5000/api/health

---

## 🏭 **Production Deployment**

### **1. Server Preparation**

**Update System:**

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git build-essential
```

**Install Node.js (Production):**

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**Install PostgreSQL (Production):**

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Secure installation
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'secure_postgres_password';"
```

**Install PM2 (Process Manager):**

```bash
sudo npm install -g pm2
```

**Install Nginx (Reverse Proxy):**

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### **2. Application Deployment**

**Create Application Directory:**

```bash
sudo mkdir -p /var/www/asset-access-control
sudo chown $USER:$USER /var/www/asset-access-control
cd /var/www/asset-access-control
```

**Clone and Setup Backend:**

```bash
git clone https://github.com/MadihDev/asset-access-control.git .

cd backend

# Install production dependencies
npm ci --only=production

# Create production environment file
sudo nano .env
```

**Production Backend Environment (`.env`):**

```env
# Database Configuration
DATABASE_URL="postgresql://rfid_user:secure_password@localhost:5432/rfid_access_control?schema=public"

# JWT Configuration
JWT_SECRET="production-super-secure-jwt-secret-key-64-chars-minimum"
JWT_REFRESH_SECRET="production-super-secure-refresh-secret-key-64-chars-minimum"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server Configuration
PORT=5000
NODE_ENV="production"
CORS_ORIGIN="https://your-domain.com"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=14

# Logging
LOG_LEVEL="info"
LOG_FILE="/var/log/asset-access-control/app.log"

# Database Connection Pool
DATABASE_POOL_SIZE=20
```

**Build and Deploy Backend:**

```bash
# Build TypeScript
npm run build

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed production data (optional)
npx prisma db seed
```

**Setup Frontend:**

```bash
cd ../rfid-frontend

# Install dependencies
npm ci

# Create production environment
nano .env.production
```

**Production Frontend Environment (`.env.production`):**

```env
# API Configuration
VITE_API_BASE_URL="https://api.your-domain.com/api"

# Production
VITE_NODE_ENV="production"

# Security
VITE_ENABLE_DEBUG=false
```

**Build Frontend:**

```bash
# Build for production
npm run build

# Verify build output
ls -la dist/
```

### **3. Process Management with PM2**

**Create PM2 Ecosystem File:**

```bash
cd /var/www/asset-access-control
nano ecosystem.config.js
```

**PM2 Configuration (`ecosystem.config.js`):**

```javascript
module.exports = {
  apps: [
    {
      name: "asset-access-control-backend",
      cwd: "./backend",
      script: "dist/src/index.js",
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      error_file: "/var/log/pm2/asset-access-control-error.log",
      out_file: "/var/log/pm2/asset-access-control-out.log",
      log_file: "/var/log/pm2/asset-access-control.log",
      time: true,
      max_memory_restart: "500M",
      node_args: "--max-old-space-size=1024",
    },
  ],
};
```

**Start Application:**

```bash
# Create log directories
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

### **4. Nginx Configuration**

**Create Nginx Site Configuration:**

```bash
sudo nano /etc/nginx/sites-available/asset-access-control
```

**Nginx Configuration:**

```nginx
# Frontend Server Block
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    root /var/www/asset-access-control/rfid-frontend/dist;
    index index.html;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate max-age=0;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}

# API Server Block (Optional: separate subdomain)
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable Site:**

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/asset-access-control /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### **5. SSL Certificate Setup**

**Install Certbot:**

```bash
sudo apt install -y certbot python3-certbot-nginx
```

**Obtain SSL Certificate:**

```bash
# Get certificate for your domain
sudo certbot --nginx -d your-domain.com -d www.your-domain.com -d api.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### **6. Database Production Setup**

**Secure PostgreSQL:**

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf

# Add these configurations:
# listen_addresses = 'localhost'
# max_connections = 100
# shared_buffers = 256MB
# effective_cache_size = 1GB
# work_mem = 4MB
# maintenance_work_mem = 64MB

# Edit pg_hba.conf for security
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**Create Production Database:**

```sql
sudo -u postgres psql

CREATE DATABASE rfid_access_control_prod;
CREATE USER rfid_prod_user WITH ENCRYPTED PASSWORD 'very_secure_production_password';
GRANT ALL PRIVILEGES ON DATABASE rfid_access_control_prod TO rfid_prod_user;

-- Create backup user
CREATE USER rfid_backup_user WITH ENCRYPTED PASSWORD 'backup_user_password';
GRANT CONNECT ON DATABASE rfid_access_control_prod TO rfid_backup_user;
GRANT USAGE ON SCHEMA public TO rfid_backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO rfid_backup_user;

\q
```

### **7. Monitoring and Logging**

**Setup Log Rotation:**

```bash
sudo nano /etc/logrotate.d/asset-access-control
```

**Log Rotation Configuration:**

```
/var/log/asset-access-control/*.log {
    weekly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload asset-access-control-backend
    endscript
}
```

**Setup System Monitoring:**

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Setup PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

---

## 🐳 **Docker Deployment**

### **1. Docker Compose Setup**

**Create `docker-compose.prod.yml`:**

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: rfid_access_control
      POSTGRES_USER: rfid_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rfid_user -d rfid_access_control"]
      interval: 30s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - DATABASE_URL=postgresql://rfid_user:${POSTGRES_PASSWORD}@postgres:5432/rfid_access_control?schema=public
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - NODE_ENV=production
      - PORT=5000
      - REDIS_URL=redis://redis:6379
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 5

  frontend:
    build:
      context: ./rfid-frontend
      dockerfile: Dockerfile.prod
      args:
        - VITE_API_BASE_URL=${API_BASE_URL}
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - ./ssl:/etc/nginx/ssl:ro

volumes:
  postgres_data:
```

**Create Backend Dockerfile (`backend/Dockerfile.prod`):**

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

USER nodejs

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/index.js"]
```

**Create Frontend Dockerfile (`rfid-frontend/Dockerfile.prod`):**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build arguments
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx-user
RUN adduser -S nginx-user -u 1001

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

**Deploy with Docker:**

```bash
# Create environment file
cp .env.example .env.prod

# Edit production environment variables
nano .env.prod

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🔒 **Security Hardening**

### **1. Server Security**

**Firewall Configuration:**

```bash
# Install UFW
sudo apt install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow necessary ports
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

**Fail2Ban Setup:**

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Configure Fail2Ban
sudo nano /etc/fail2ban/jail.local
```

**Fail2Ban Configuration:**

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/*error.log
findtime = 600
bantime = 7200
maxretry = 10
```

### **2. Application Security**

**Environment Variables Security:**

```bash
# Secure environment files
chmod 600 /var/www/asset-access-control/backend/.env
chown root:root /var/www/asset-access-control/backend/.env
```

**Database Security:**

```bash
# Restrict PostgreSQL access
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add these lines (replace existing)
local   all             postgres                                peer
local   all             all                                     md5
host    rfid_access_control    rfid_prod_user    127.0.0.1/32      md5
host    rfid_access_control    rfid_prod_user    ::1/128           md5
```

---

## 📊 **Monitoring and Maintenance**

### **1. Health Monitoring**

**Create Health Check Script:**

```bash
nano /usr/local/bin/health-check.sh
```

**Health Check Script:**

```bash
#!/bin/bash

# Health check script for Asset Access Control System
LOG_FILE="/var/log/asset-access-control/health-check.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting health check..." >> $LOG_FILE

# Check backend health
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health)
if [ $BACKEND_STATUS -ne 200 ]; then
    echo "[$DATE] ERROR: Backend health check failed (HTTP $BACKEND_STATUS)" >> $LOG_FILE
    pm2 restart asset-access-control-backend
fi

# Check database connection
DB_STATUS=$(sudo -u postgres psql -d rfid_access_control_prod -c "SELECT 1;" 2>&1)
if [[ $DB_STATUS == *"ERROR"* ]]; then
    echo "[$DATE] ERROR: Database connection failed" >> $LOG_FILE
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "[$DATE] WARNING: Disk usage is at ${DISK_USAGE}%" >> $LOG_FILE
fi

echo "[$DATE] Health check completed" >> $LOG_FILE
```

**Setup Cron Job:**

```bash
# Make script executable
sudo chmod +x /usr/local/bin/health-check.sh

# Add to crontab
sudo crontab -e

# Add this line (run every 5 minutes)
*/5 * * * * /usr/local/bin/health-check.sh
```

### **2. Backup Strategy**

**Database Backup Script:**

```bash
nano /usr/local/bin/backup-database.sh
```

**Backup Script:**

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/asset-access-control"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="rfid_access_control_prod"
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
sudo -u postgres pg_dump $DB_NAME | gzip > $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

echo "Database backup completed: $BACKUP_FILE"
```

**Setup Automated Backups:**

```bash
# Make script executable
sudo chmod +x /usr/local/bin/backup-database.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e

# Add this line
0 2 * * * /usr/local/bin/backup-database.sh
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

**Backend Won't Start:**

```bash
# Check logs
pm2 logs asset-access-control-backend

# Check environment variables
pm2 env 0

# Restart service
pm2 restart asset-access-control-backend
```

**Database Connection Issues:**

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U rfid_prod_user -d rfid_access_control_prod

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

**Frontend Not Loading:**

```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### **Performance Optimization**

**Database Optimization:**

```sql
-- Connect to database
sudo -u postgres psql rfid_access_control_prod

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM locks WHERE "isActive" = true;

-- Update table statistics
ANALYZE;

-- Vacuum database
VACUUM;
```

**PM2 Monitoring:**

```bash
# Monitor processes
pm2 monit

# View detailed logs
pm2 logs --lines 100

# Restart with zero downtime
pm2 reload all
```

---

## 📋 **Deployment Checklist**

### **Pre-Deployment**

- [ ] Server meets minimum requirements
- [ ] All dependencies installed
- [ ] Database created and configured
- [ ] SSL certificates obtained
- [ ] Environment variables configured
- [ ] Security hardening completed

### **Deployment**

- [ ] Code deployed and built successfully
- [ ] Database migrations run
- [ ] PM2 processes started
- [ ] Nginx configured and running
- [ ] SSL working correctly
- [ ] Health checks passing

### **Post-Deployment**

- [ ] Application accessible via domain
- [ ] All features working correctly
- [ ] Monitoring configured
- [ ] Backups automated
- [ ] Documentation updated
- [ ] Team notified

---

**Last Updated:** September 27, 2025  
**Guide Version:** 2.1  
**Deployment Status:** Production Ready

This comprehensive deployment guide covers all aspects of setting up the Asset Access Control System from development to production environments. Follow the appropriate section based on your deployment needs. 🚀✨
