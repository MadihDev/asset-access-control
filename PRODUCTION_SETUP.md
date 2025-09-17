# Production Setup Guide

## 🚀 Quick Start

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb rfid_access_control

# Or using SQL
psql -U postgres -c "CREATE DATABASE rfid_access_control;"
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Environment Configuration

```bash
# Update .env file with your database credentials
DATABASE_URL="postgresql://postgres:your-password@localhost:5433/rfid_access_control"
JWT_SECRET="your-super-secure-jwt-secret"
```

### 4. Database Migration & Seeding

```bash
# Create and run initial migration
npx prisma migrate dev --name init

# Seed database with sample data
npm run db:seed

# (Optional) Open Prisma Studio to view data
npm run db:studio
```

### 5. Start Development Server

```bash
npm run dev
```

## 🔧 Available Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset database and reseed
- `npm run db:studio` - Open Prisma Studio GUI
- `npm run db:seed` - Seed database with sample data

## 🔑 Default Credentials

After seeding, you can login with:

- **Super Admin**: admin@example.com / password123
- **Manager**: manager@example.com / password123
- **Supervisor**: supervisor@example.com / password123
- **User**: user1@example.com / password123

## 📊 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/reset-password` - Reset password

### Users

- `GET /api/users` - List all users (Admin+)
- `POST /api/users` - Create new user (Admin+)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (Admin+)
- `DELETE /api/users/:id` - Delete user (Admin+)
- `GET /api/users/:id/stats` - Get user statistics

### Access Control

- `POST /api/lock/access-attempt` - Log access attempt (Public)
- `GET /api/lock/access-logs` - Get access logs
- `GET /api/lock/access-logs/export` - Export logs as CSV (Manager+)
- `GET /api/lock/access-stats` - Get access statistics (Manager+)

## 🏗️ Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts           # Database seeding script
├── src/
│   ├── controllers/      # Route controllers
│   ├── services/         # Business logic
│   ├── middleware/       # Authentication & validation
│   ├── routes/          # API routes
│   ├── types/           # TypeScript interfaces
│   └── index.ts         # Application entry point
├── .env                 # Environment variables
├── package.json         # Dependencies & scripts
└── README.md           # This file
```

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Input validation with express-validator
- Rate limiting
- CORS protection
- Helmet security headers
- Audit logging

## 📈 Monitoring & Logging

- Winston logger for structured logging
- Access attempt tracking
- Audit trail for all system changes
- Performance monitoring ready

## 🐳 Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 🔧 Production Configuration

1. **Environment Variables**:

   - Set `NODE_ENV=production`
   - Use strong JWT secrets
   - Configure proper database credentials

2. **Database**:

   - Use connection pooling
   - Enable SSL for production databases
   - Regular backups

3. **Security**:

   - Use HTTPS in production
   - Configure proper CORS origins
   - Set up proper firewall rules

4. **Monitoring**:
   - Set up application monitoring
   - Configure log aggregation
   - Health check endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support, email support@yourcompany.com or create an issue on GitHub.
