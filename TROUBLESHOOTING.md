# 🔧 **Asset Access Control System - Troubleshooting Guide**

## 🎯 **Overview**

This comprehensive troubleshooting guide provides solutions for common issues, diagnostic procedures, and maintenance tasks for the Asset Access Control System. With **95.9% Security Rating** and enterprise-grade security features including enhanced JWT, security monitoring, and multi-layer protection, this guide covers both standard operations and security-related troubleshooting. Use this guide to quickly identify and resolve problems across all system components.

---

## 🚨 **Emergency Quick Reference**

### **Critical System Issues**

| Problem                       | Quick Fix                       | Escalation                 |
| ----------------------------- | ------------------------------- | -------------------------- |
| **System completely down**    | Check backend/frontend services | Contact IT immediately     |
| **Database connection lost**  | Restart PostgreSQL service      | DBA support required       |
| **All users can't login**     | Check JWT secrets in .env       | Security team alert        |
| **RFID readers offline**      | Check network connectivity      | Hardware vendor support    |
| **Security breach suspected** | Follow incident response plan   | Security team + management |

### **Emergency Commands**

```bash
# Check system status
curl http://localhost:5000/api/health

# Check security monitoring status
curl -H "Authorization: Bearer ADMIN_TOKEN" http://localhost:5000/api/security/dashboard

# Restart services (Linux/macOS)
sudo systemctl restart postgresql
sudo systemctl restart nginx
pm2 restart all

# Restart services (Windows)
net stop postgresql-x64-14
net start postgresql-x64-14
iisreset
```

---

## 🖥️ **Backend Issues**

### **Server Won't Start**

**Symptoms:**

- `npm run dev` fails to start
- Port already in use errors
- Database connection errors

**Diagnostic Steps:**

```bash
# Check if port is in use
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Linux/macOS

# Check Node.js version
node --version  # Should be ≥ 18.0.0

# Check environment variables
cat .env | grep -v "SECRET"  # Don't expose secrets

# Test database connection
npx prisma db pull
```

**Solutions:**

**Port Already in Use:**

```bash
# Find and kill process using port 5000
# Windows
taskkill /PID <PID> /F

# Linux/macOS
kill -9 <PID>

# Or change port in .env
PORT=5001
```

**Database Connection Issues:**

```bash
# Check PostgreSQL status
# Windows
net start | findstr postgresql

# Linux
sudo systemctl status postgresql

# macOS
brew services list | grep postgresql

# Test connection manually
psql -d rfid_access_control -c "SELECT 1;"
```

**Environment Variable Issues:**

```bash
# Verify .env file exists and has correct format
ls -la .env
cat .env

# Common missing variables (Enterprise Security)
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
SECURITY_MONITORING_ENABLED=
ENHANCED_JWT_ENABLED=
DATABASE_SECURITY_ENABLED=
RATE_LIMITING_ENABLED=
WINSTON_LOG_LEVEL=
```

### **API Errors**

**500 Internal Server Error:**

**Diagnostic Steps:**

```bash
# Check server logs
npm run dev  # Look for error messages
tail -f logs/error.log

# Check database schema
npx prisma migrate status
npx prisma generate
```

**Common Causes & Solutions:**

1. **Database Schema Out of Sync:**

```bash
# Reset and re-apply migrations
npx prisma migrate reset
npx prisma migrate dev
npx prisma db seed
```

2. **Missing Prisma Client:**

```bash
# Regenerate Prisma client
npx prisma generate
npm restart
```

3. **Enhanced JWT Token Issues:**

```bash
# Verify JWT secrets are set and long enough (min 32 chars)
echo $JWT_SECRET | wc -c  # Should be >32

# Check token format in requests (RFC 7519 compliant)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/health

# Test enhanced JWT features
node -e "
  const jwt = require('jsonwebtoken');
  const token = 'YOUR_TOKEN';
  const decoded = jwt.decode(token, {complete: true});
  console.log('Enhanced JWT Claims:', decoded.payload);
  console.log('Security Features:', {
    hasIP: !!decoded.payload.ip,
    hasDeviceFingerprint: !!decoded.payload.deviceFingerprint,
    hasTenantId: !!decoded.payload.tenantId
  });
"
```

**401 Unauthorized Errors:**

**Diagnostic Steps:**

```bash
# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "perfectitadmin",
    "password": "password123",
    "projectId": "perfectit-solutions",
    "cityName": "Amsterdam"
  }'

# Verify token is valid
node -e "console.log(require('jsonwebtoken').decode('YOUR_TOKEN'))"
```

**Solutions:**

- Verify user credentials exist in database
- Check token expiration time
- Ensure Authorization header format: `Bearer <token>`
- Verify JWT_SECRET matches between token creation and validation

### **Database Issues**

**Connection Pool Exhausted:**

**Symptoms:**

- "Connection pool timeout" errors
- Slow query responses
- High database CPU usage

**Solutions:**

```typescript
// Increase connection pool size in DATABASE_URL
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=20"

// Or in Prisma schema
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["connection_pooling"]
}

datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
  connection_limit = 20
}
```

**Slow Queries:**

**Diagnostic Steps:**

```sql
-- Enable query logging in PostgreSQL
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries >1s
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Solutions:**

- Add database indexes for frequently queried columns
- Optimize N+1 query problems with Prisma `include`
- Implement query result caching
- Consider database connection pooling

---

## 🌐 **Frontend Issues**

### **React Application Won't Start**

**Symptoms:**

- `npm run dev` fails
- Compilation errors
- Dependency conflicts

**Diagnostic Steps:**

```bash
# Check Node.js and npm versions
node --version  # Should be ≥ 18.0.0
npm --version   # Should be ≥ 8.0.0

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Check for dependency conflicts
npm ls
```

**Common Solutions:**

**TypeScript Compilation Errors:**

```bash
# Check TypeScript configuration
npx tsc --noEmit

# Clear TypeScript cache
rm -rf .tsc-cache
rm -rf dist

# Reinstall TypeScript dependencies
npm install --save-dev typescript @types/react @types/react-dom
```

**Vite Configuration Issues:**

```typescript
// vite.config.ts - Common fixes
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### **API Connection Issues**

**Symptoms:**

- "Network Error" messages
- API calls failing
- CORS errors

**Diagnostic Steps:**

```bash
# Test API connectivity from frontend dev server
curl http://localhost:5000/api/health

# Check browser console for CORS errors
# F12 → Console → Look for CORS messages

# Verify environment variables
cat .env | grep VITE_API_BASE_URL
```

**Solutions:**

**CORS Configuration:**

```typescript
// Backend: src/index.ts
import cors from "cors";

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
```

**API Base URL Issues:**

```typescript
// Frontend: .env
VITE_API_BASE_URL=http://localhost:5000/api

// Verify in code
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
```

### **Authentication Issues**

**Token Storage Problems:**

**Diagnostic Steps:**

```javascript
// Check localStorage in browser console
console.log("Token:", localStorage.getItem("auth_token"));
console.log("User:", localStorage.getItem("user_data"));

// Clear storage if corrupted
localStorage.clear();
sessionStorage.clear();
```

**Auto-logout Issues:**

```typescript
// Check token expiration
const token = localStorage.getItem("auth_token");
if (token) {
  const decoded = JSON.parse(atob(token.split(".")[1]));
  console.log("Token expires:", new Date(decoded.exp * 1000));
  console.log("Current time:", new Date());
}
```

---

## 🗄️ **Database Issues**

### **PostgreSQL Connection Problems**

**Service Not Running:**

**Windows:**

```powershell
# Check service status
Get-Service -Name "*postgresql*"

# Start service
net start postgresql-x64-14

# If service won't start, check event logs
Get-EventLog -LogName Application -Source "*PostgreSQL*" -Newest 10
```

**Linux/Ubuntu:**

```bash
# Check service status
sudo systemctl status postgresql

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check logs
sudo journalctl -u postgresql -f
```

**macOS:**

```bash
# Using Homebrew
brew services list | grep postgresql
brew services start postgresql@14

# Check logs
tail -f /usr/local/var/log/postgresql@14.log
```

### **Database Performance Issues**

**Slow Queries:**

**Identify Problem Queries:**

```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Common Performance Fixes:**

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);

-- Analyze table statistics
ANALYZE users;
ANALYZE access_logs;
ANALYZE locks;

-- Check for bloated tables
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### **Prisma Issues**

**Migration Problems:**

**Migration Failed:**

```bash
# Check migration status
npx prisma migrate status

# Reset database (⚠️ DELETES ALL DATA)
npx prisma migrate reset

# Apply pending migrations
npx prisma migrate dev

# Generate client after schema changes
npx prisma generate
```

**Schema Sync Issues:**

```bash
# Pull current database schema
npx prisma db pull

# Compare with prisma/schema.prisma
# Resolve conflicts manually

# Push schema changes to database
npx prisma db push
```

**Client Generation Issues:**

```bash
# Clear Prisma cache
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma

# Reinstall Prisma
npm uninstall prisma @prisma/client
npm install prisma @prisma/client

# Regenerate client
npx prisma generate
```

---

## 💳 **RFID System Issues**

### **RFID Cards Not Working**

**Card Not Recognized:**

**Diagnostic Steps:**

1. **Check card assignment in database:**

```sql
SELECT u.username, rc.card_id, rc.is_active, rc.expires_at
FROM rfid_cards rc
JOIN users u ON u.id = rc.user_id
WHERE rc.card_id = 'CARD_ID_HERE';
```

2. **Verify user permissions:**

```sql
SELECT l.name, up.expires_at, up.is_active
FROM user_permissions up
JOIN locks l ON l.id = up.lock_id
JOIN users u ON u.id = up.user_id
WHERE u.username = 'USERNAME_HERE';
```

3. **Check access logs for failed attempts:**

```sql
SELECT created_at, lock_name, result, error_message
FROM access_logs
WHERE user_id = (SELECT id FROM users WHERE username = 'USERNAME_HERE')
ORDER BY created_at DESC
LIMIT 10;
```

**Solutions:**

- **Card not assigned**: Assign card to user in admin panel
- **Card expired**: Update expiration date or reactivate card
- **No permissions**: Grant user permission to specific locks
- **Card damaged**: Issue replacement card and update database

### **RFID Reader Issues**

**Reader Offline:**

**Diagnostic Steps:**

```bash
# Check network connectivity to reader
ping READER_IP_ADDRESS

# Test reader HTTP endpoint (if available)
curl http://READER_IP_ADDRESS/status

# Check firewall rules
# Windows
netsh advfirewall firewall show rule name="RFID Reader"

# Linux
sudo iptables -L | grep READER_PORT
```

**Solutions:**

- **Network issues**: Check cables, switch ports, IP configuration
- **Power issues**: Verify power supply, check for loose connections
- **Firmware issues**: Update reader firmware, check vendor documentation
- **Configuration issues**: Verify reader settings, server endpoints

**Reader Communication Errors:**

**Check Reader Logs:**

```bash
# If reader supports logging
curl http://READER_IP_ADDRESS/logs

# Check server-side communication logs
grep "RFID" logs/access.log
grep "reader" logs/error.log
```

**Common Fixes:**

- **SSL certificate issues**: Update reader certificates
- **Authentication problems**: Verify reader API keys
- **Network timeouts**: Adjust timeout settings
- **Protocol mismatches**: Verify communication protocol version

---

## 🔒 **Enhanced Authentication & Authorization Issues**

### **Login Problems (Enterprise Security)**

**Users Cannot Login:**

**Diagnostic Steps:**

```bash
# Test enhanced login API directly (returns RFC 7519 JWT)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass",
    "projectId": "test-project",
    "cityName": "TestCity"
  }'

# Check enhanced JWT token structure
node -e "
  const token = 'YOUR_JWT_TOKEN';
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  console.log('Enhanced JWT Payload:', JSON.stringify(payload, null, 2));
"

# Check security monitoring for failed login attempts
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5000/api/security/alerts?type=failed_login

# Check user exists in database
npx prisma studio
# Navigate to users table and search
```

**Common Issues & Solutions:**

1. **Incorrect Credentials:**

```sql
-- Verify user exists and is active
SELECT username, is_active, tenant_id FROM users WHERE username = 'USERNAME';

-- Check tenant/project configuration
SELECT * FROM projects WHERE slug = 'PROJECT_SLUG';
```

2. **Enhanced JWT Configuration Issues:**

```bash
# Verify enhanced JWT secrets are set (RFC 7519 compliant)
echo "JWT_SECRET length: $(echo -n $JWT_SECRET | wc -c)"
echo "JWT_REFRESH_SECRET length: $(echo -n $JWT_REFRESH_SECRET | wc -c)"
echo "Enhanced JWT enabled: $ENHANCED_JWT_ENABLED"
echo "Security monitoring enabled: $SECURITY_MONITORING_ENABLED"

# Both secrets should be at least 32 characters
# Enhanced JWT should be enabled for security features
```

3. **Session/Token Issues:**

```javascript
// Clear browser storage
localStorage.clear();
sessionStorage.clear();

// Clear cookies
document.cookie.split(";").forEach(function (c) {
  document.cookie = c
    .replace(/^ +/, "")
    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

### **Permission Denied Issues**

**Users Can't Access Resources:**

**Check User Permissions:**

```sql
-- Check user role and tenant
SELECT u.username, u.role, u.tenant_id, t.name as tenant_name
FROM users u
JOIN tenants t ON t.id = u.tenant_id
WHERE u.username = 'USERNAME';

-- Check specific lock permissions
SELECT l.name, up.is_active, up.expires_at
FROM user_permissions up
JOIN locks l ON l.id = up.lock_id
JOIN users u ON u.id = up.user_id
WHERE u.username = 'USERNAME';
```

**Common Solutions:**

- **Role insufficient**: Upgrade user role (USER → SUPERVISOR → ADMIN)
- **Permission expired**: Extend or renew user permissions
- **Wrong tenant**: Verify user is in correct tenant/company
- **Location restrictions**: Check if user has access to lock's location

---

## 🌐 **Network & Connectivity Issues**

### **SSL/TLS Certificate Problems**

**Certificate Expired or Invalid:**

**Check Certificate Status:**

```bash
# Check certificate expiration
echo | openssl s_client -servername DOMAIN -connect DOMAIN:443 2>/dev/null | openssl x509 -noout -dates

# Verify certificate chain
openssl s_client -servername DOMAIN -connect DOMAIN:443 -showcerts

# Check Let's Encrypt renewal
sudo certbot certificates
```

**Solutions:**

```bash
# Renew Let's Encrypt certificates
sudo certbot renew

# Test renewal process
sudo certbot renew --dry-run

# Restart web server after renewal
sudo systemctl restart nginx
```

### **Load Balancer/Proxy Issues**

**Nginx Configuration Problems:**

**Check Nginx Status:**

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

**Common Nginx Fixes:**

```nginx
# /etc/nginx/sites-available/rfid-system
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Proxy settings
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    location / {
        root /var/www/rfid-frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 📊 **Performance Issues**

### **Slow Application Response**

**Backend Performance:**

**Diagnostic Steps:**

```bash
# Monitor server resources
top -p $(pgrep node)
htop

# Check memory usage
free -h
ps aux --sort=-%mem | head

# Monitor database connections
psql -d rfid_access_control -c "SELECT count(*) FROM pg_stat_activity;"
```

**Database Query Optimization:**

```sql
-- Enable query timing
\timing on

-- Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM access_logs WHERE created_at > NOW() - INTERVAL '1 day';

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
```

**Solutions:**

- **Add database indexes** for frequently queried columns
- **Implement query result caching** (Redis recommended)
- **Optimize Prisma queries** to avoid N+1 problems
- **Increase server resources** (CPU, RAM, storage)

### **High Memory Usage**

**Node.js Memory Leaks:**

**Diagnostic Steps:**

```bash
# Monitor Node.js memory usage
node --inspect src/index.ts

# Use Chrome DevTools to profile memory
# Open chrome://inspect in browser

# Check for memory leaks with clinic.js
npm install -g clinic
clinic doctor -- node src/index.ts
```

**Common Fixes:**

- **Close database connections** properly
- **Remove event listeners** when components unmount
- **Clear intervals and timeouts**
- **Optimize image/file handling**

---

## 🔍 **Monitoring & Logging**

### **Application Logs**

**Backend Logging:**

**Enable Detailed Logging:**

```typescript
// src/utils/logger.ts
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});
```

**Log Analysis:**

```bash
# Search for errors
grep -i "error" logs/combined.log | tail -20

# Monitor logs in real-time
tail -f logs/combined.log | grep -i "auth"

# Count error occurrences
grep -c "ERROR" logs/combined.log

# Search for specific user activity
grep "username_here" logs/combined.log
```

### **System Monitoring**

**Server Health Monitoring:**

**Resource Monitoring:**

```bash
# CPU usage
top -bn1 | grep "Cpu(s)"

# Memory usage
free -h

# Disk usage
df -h

# Network connections
netstat -tuln

# Process monitoring
ps aux | grep node
ps aux | grep postgres
```

**Application Monitoring:**

```bash
# Check application status with PM2
pm2 status
pm2 logs --lines 50

# Monitor API endpoint health
curl -f http://localhost:5000/api/health || echo "API DOWN"

# Database connection test
psql -d rfid_access_control -c "SELECT 1;" > /dev/null && echo "DB OK" || echo "DB ERROR"
```

---

## 🛠️ **Development Environment Issues**

### **Development Setup Problems**

**Node Modules Issues:**

**Common Solutions:**

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Fix permission issues (macOS/Linux)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) node_modules

# Use specific Node version with nvm
nvm install 18.17.0
nvm use 18.17.0
```

**TypeScript Configuration Issues:**

```bash
# Check TypeScript version
npx tsc --version

# Validate tsconfig.json
npx tsc --noEmit

# Clear TypeScript cache
rm -rf node_modules/.cache
rm -rf .tsbuildinfo
```

### **Docker Issues**

**Container Startup Problems:**

**Diagnostic Steps:**

```bash
# Check Docker status
docker --version
docker-compose --version

# View container logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Check container status
docker-compose ps

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Volume Mount Issues:**

```bash
# Check volume permissions
ls -la ./backend
ls -la ./rfid-frontend

# Fix permissions (Linux/macOS)
sudo chown -R $(whoami):$(whoami) ./backend
sudo chown -R $(whoami):$(whoami) ./rfid-frontend
```

---

## �️ **Security System Troubleshooting**

### **Security Monitoring Issues**

**Security Dashboard Not Loading:**

**Diagnostic Steps:**

```bash
# Test security monitoring endpoints
curl -H "Authorization: Bearer ADMIN_TOKEN" http://localhost:5000/api/security/dashboard
curl -H "Authorization: Bearer ADMIN_TOKEN" http://localhost:5000/api/security/metrics
curl -H "Authorization: Bearer ADMIN_TOKEN" http://localhost:5000/api/security/alerts

# Check Winston logging service
tail -f logs/security.log | grep "SecurityMonitoring"

# Verify security monitoring service status
grep "securityMonitoring" logs/combined.log | tail -10
```

**Solutions:**

```bash
# Restart security monitoring service
pm2 restart asset-access-control-backend

# Check security monitoring configuration
grep -i "security" .env

# Verify security middleware is loaded
curl -v http://localhost:5000/api/health | grep -i "x-security-monitor"
```

### **Rate Limiting Issues**

**Rate Limit Errors (429):**

**Diagnostic Steps:**

```bash
# Check current rate limit status
curl -v http://localhost:5000/api/auth/login 2>&1 | grep -i "x-rate-limit"

# View rate limiting logs
grep "Rate limit" logs/combined.log | tail -20

# Check rate limiting configuration
grep -i "rate" .env
```

**Solutions:**

```bash
# Adjust rate limiting in .env (if needed)
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_WINDOW_MS=900000

# Clear rate limiting cache (if using Redis)
redis-cli FLUSHDB

# Whitelist trusted IPs (if configured)
# Add to rate limiting whitelist configuration
```

### **Enhanced JWT Issues**

**JWT Security Claims Missing:**

**Diagnostic Steps:**

```bash
# Decode and verify enhanced JWT claims
node -e "
  const jwt = require('jsonwebtoken');
  const token = 'YOUR_TOKEN';
  const decoded = jwt.decode(token);
  const requiredClaims = ['ip', 'deviceFingerprint', 'tenantId', 'sessionId'];
  console.log('JWT Claims Check:');
  requiredClaims.forEach(claim => {
    console.log(\`\${claim}: \${decoded[claim] ? '✅ Present' : '❌ Missing'}\`);
  });
"

# Check enhanced JWT service
grep "enhancedAuth" logs/combined.log | tail -10
```

**Solutions:**

```bash
# Ensure enhanced JWT is enabled
ENHANCED_JWT_ENABLED=true

# Restart authentication service
pm2 restart asset-access-control-backend

# Clear user sessions to force re-authentication
# Users will need to log in again to get enhanced tokens
```

### **Database Security Issues**

**Database Connection Security:**

**Diagnostic Steps:**

```bash
# Check SSL database connections
psql "sslmode=require host=localhost dbname=rfid_access_control" -c "SELECT version();"

# Verify enhanced database security
grep "DATABASE_SECURITY_ENABLED" .env

# Check database query monitoring
tail -f logs/combined.log | grep -i "database"
```

**Solutions:**

```bash
# Enable database security hardening
DATABASE_SECURITY_ENABLED=true
DATABASE_SSL_ENABLED=true
DATABASE_QUERY_MONITORING=true

# Restart application to apply security settings
pm2 restart asset-access-control-backend
```

---

## �📱 **Mobile & Browser Issues**

### **Browser Compatibility**

**Supported Browsers:**

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Common Browser Issues:**

**LocalStorage Problems:**

```javascript
// Check if localStorage is available
if (typeof Storage !== "undefined") {
  console.log("LocalStorage supported");
} else {
  console.log("LocalStorage not supported");
}

// Clear browser data
localStorage.clear();
sessionStorage.clear();
// Clear cookies manually or via browser settings
```

**Cache Issues:**

```javascript
// Force cache refresh
window.location.reload(true); // Legacy
window.location.reload(); // Modern

// Or use Ctrl+F5 / Cmd+Shift+R
```

### **Mobile Browser Issues**

**Responsive Design Problems:**

```css
/* Check viewport meta tag */
<meta name="viewport" content="width=device-width, initial-scale=1.0">

/* Debug mobile layout */
.debug-mobile {
  border: 2px solid red;
  background: rgba(255, 0, 0, 0.1);
}
```

**Touch Interface Issues:**

- **Small touch targets**: Ensure buttons are at least 44px
- **Scroll issues**: Check for `overflow: hidden` problems
- **Input focus**: Verify input fields work on mobile keyboards

---

## 🆘 **Emergency Procedures**

### **System Recovery**

**Complete System Failure:**

**Recovery Steps:**

1. **Assess the situation**: Determine scope of failure
2. **Check infrastructure**: Servers, network, database
3. **Review recent changes**: Git commits, deployments, config changes
4. **Restore from backup**: Database and application files
5. **Verify functionality**: Test critical paths
6. **Document incident**: What happened, what was done

**Backup Restoration:**

```bash
# Database backup restoration
pg_restore -d rfid_access_control backup_file.sql

# Or from SQL dump
psql -d rfid_access_control < backup_file.sql

# Application files restoration
tar -xzf application_backup.tar.gz
rsync -av backup_directory/ production_directory/
```

### **Security Incidents**

**Suspected Breach:**

**Immediate Actions:**

1. **Isolate affected systems**: Disconnect from network if necessary
2. **Preserve evidence**: Don't modify logs or system state
3. **Notify security team**: Follow incident response plan
4. **Document everything**: Time, actions taken, observations
5. **Begin investigation**: Identify attack vectors and scope

**User Account Compromise:**

```bash
# Immediately disable user account
psql -d rfid_access_control -c "UPDATE users SET is_active = false WHERE username = 'COMPROMISED_USER';"

# Revoke all user sessions
# (Implementation depends on session management)

# Check user's recent activity
psql -d rfid_access_control -c "SELECT * FROM access_logs WHERE user_id = (SELECT id FROM users WHERE username = 'COMPROMISED_USER') ORDER BY created_at DESC LIMIT 50;"
```

---

## 📞 **Getting Additional Help**

### **Internal Support Contacts**

**Development Team:**

- **Lead Developer**: dev-lead@company.com
- **Backend Team**: backend@company.com
- **Frontend Team**: frontend@company.com
- **DevOps Team**: devops@company.com

**Operations Team:**

- **System Administrator**: sysadmin@company.com
- **Database Administrator**: dba@company.com
- **Security Team**: security@company.com
- **Network Team**: network@company.com

### **External Support**

**Vendor Support:**

- **RFID Hardware**: vendor-support@rfid-company.com
- **Cloud Provider**: support@cloud-provider.com
- **Database Support**: postgresql-support@company.com

**Emergency Contacts:**

- **24/7 IT Hotline**: +1-XXX-XXX-XXXX
- **Security Incident**: security-incident@company.com
- **Management Escalation**: management@company.com

### **Documentation & Resources**

**Internal Documentation:**

- **ARCHITECTURE.md**: System architecture overview
- **API_DOCUMENTATION.md**: Complete API reference
- **DEPLOYMENT_GUIDE.md**: Deployment procedures
- **SECURITY_GUIDELINES.md**: Security policies and procedures
- **USER_MANUAL.md**: End-user instructions

**External Resources:**

- **Node.js Documentation**: https://nodejs.org/docs/
- **React Documentation**: https://reactjs.org/docs/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Prisma Documentation**: https://www.prisma.io/docs/

---

## 📋 **Troubleshooting Checklist**

### **Before Contacting Support**

**Information to Gather:**

- [ ] **Error messages**: Exact error text and stack traces
- [ ] **Steps to reproduce**: What actions led to the problem
- [ ] **Environment details**: Development/staging/production
- [ ] **Recent changes**: Deployments, configuration changes, updates
- [ ] **System status**: CPU, memory, disk usage
- [ ] **Log files**: Relevant application and system logs
- [ ] **User impact**: How many users affected, business impact
- [ ] **Workarounds**: Any temporary fixes attempted

### **Quick Diagnostic Commands**

**Enterprise Security System Health Check:**

```bash
# Check all critical services
curl -f http://localhost:5000/api/health && echo "✅ Backend OK" || echo "❌ Backend Failed"
curl -f http://localhost:5173 && echo "✅ Frontend OK" || echo "❌ Frontend Failed"
psql -d rfid_access_control -c "SELECT 1;" > /dev/null && echo "✅ Database OK" || echo "❌ Database Failed"

# Check security monitoring system
curl -H "Authorization: Bearer ADMIN_TOKEN" -f http://localhost:5000/api/security/dashboard > /dev/null && echo "✅ Security Monitoring OK" || echo "❌ Security Monitoring Failed"

# Check enhanced security features
echo "🛡️ Security Features Status:"
grep -q "SECURITY_MONITORING_ENABLED=true" .env && echo "✅ Security Monitoring Enabled" || echo "❌ Security Monitoring Disabled"
grep -q "ENHANCED_JWT_ENABLED=true" .env && echo "✅ Enhanced JWT Enabled" || echo "❌ Enhanced JWT Disabled"
grep -q "RATE_LIMITING_ENABLED=true" .env && echo "✅ Rate Limiting Enabled" || echo "❌ Rate Limiting Disabled"
grep -q "DATABASE_SECURITY_ENABLED=true" .env && echo "✅ Database Security Enabled" || echo "❌ Database Security Disabled"

# Check resource usage
echo "🖥️ System Resources:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')"
echo "Memory: $(free | grep Mem | awk '{printf("%.1f%"), $3/$2 * 100.0}')"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"

# Check process status
echo "📊 Process Status:"
pgrep -f "node.*src/index" > /dev/null && echo "✅ Backend Process Running" || echo "❌ Backend Process Stopped"
pgrep postgres > /dev/null && echo "✅ PostgreSQL Running" || echo "❌ PostgreSQL Stopped"

# Check security logs
echo "📋 Security Status:"
tail -1 logs/security.log 2>/dev/null && echo "✅ Security Logging Active" || echo "❌ Security Logging Inactive"
```

---

**Last Updated:** October 1, 2025  
**Document Version:** 2.2  
**System Compatibility:** All current versions  
**Security Rating:** 95.9% (Enterprise Grade)  
**Support Level:** Enterprise Production Ready

This comprehensive troubleshooting guide covers all major system components and common issues. Keep this document accessible during system maintenance and incident response. For complex issues not covered here, follow the escalation procedures and contact the appropriate support teams. 🔧✨
