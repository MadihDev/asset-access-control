# RFID Access Control - Backend Installation

## Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

## Installation Steps

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Database Setup**
   ```bash
   # Install Prisma CLI globally (if not already installed)
   npm install -g prisma

   # Generate Prisma client
   npx prisma generate

   # Run database migrations
   npx prisma migrate dev --name init

   # Seed database (optional)
   npx prisma db seed
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your database credentials
   # DATABASE_URL="postgresql://username:password@localhost:5433/rfid_access_control"
   # JWT_SECRET="your-super-secret-jwt-key"
   # PORT=5000
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run db:reset` - Reset database and reseed
- `npm run db:studio` - Open Prisma Studio GUI

## API Documentation

### Health Check
- **GET** `/api/health` - System health status

### Authentication
- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/logout` - User logout
- **POST** `/api/auth/refresh` - Refresh JWT token

### Users
- **GET** `/api/users` - List all users (Admin only)
- **POST** `/api/users` - Create new user (Admin only)
- **GET** `/api/users/:id` - Get user by ID
- **PUT** `/api/users/:id` - Update user
- **DELETE** `/api/users/:id` - Delete user (Admin only)

### Locks
- **GET** `/api/locks` - List all locks
- **POST** `/api/locks` - Create new lock (Admin only)
- **GET** `/api/locks/:id` - Get lock by ID
- **PUT** `/api/locks/:id` - Update lock
- **DELETE** `/api/locks/:id` - Delete lock (Admin only)
- **POST** `/api/locks/access-attempt` - Log access attempt

### Access Logs
- **GET** `/api/access-logs` - List access logs with filters
- **GET** `/api/access-logs/export` - Export logs as CSV

### Audit Logs
- **GET** `/api/audit-logs` - List audit logs (Admin only)

## Testing

### Manual Testing
```bash
# Health check
curl http://localhost:5000/api/health

# Login (after creating a user)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

### Automated Testing
```bash
npm test
```