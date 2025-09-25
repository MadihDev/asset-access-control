# 📋 RFID Asset Access Control System - Technical Report

## 📌 Tech Stack

### Backend (Node.js/Express)

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 17 with Prisma ORM v5.22.0
- **Authentication**: JWT with refresh token support (bcryptjs for hashing)
- **Real-time**: Socket.io v4.7.5 for WebSocket connections
- **Security**: Helmet, CORS, Express Rate Limit, Express Validator
- **File Processing**: Multer (file uploads), CSV-Parser & CSV-Writer
- **Logging**: Winston, Morgan
- **Compression**: Express compression middleware
- **External APIs**: Twilio v5.9.0 (SMS notifications - planned)
- **Testing**: Jest with Supertest
- **Development**: ts-node-dev, ESLint, Prettier

### Frontend (React/Vite)

- **Framework**: React 19.1.1 with TypeScript
- **Build Tool**: Vite v5.4.20
- **Styling**: Tailwind CSS v4.1.13 with PostCSS
- **State Management**: TanStack React Query v5.87.4 for server state
- **HTTP Client**: Axios v1.12.2 with interceptors
- **Routing**: React Router DOM v7.9.1
- **Real-time**: Socket.io Client v4.7.5
- **Testing**: Vitest, Testing Library, Happy-DOM

### Database Schema

- **Users**: Multi-role system (SUPER_ADMIN, ADMIN, SUPERVISOR, USER)
- **Cities & Addresses**: Geographic organization structure
- **Locks**: Smart lock devices with online status tracking
- **RFID Keys**: Card-based access with expiration
- **Access Logs**: Comprehensive audit trail with result types
- **User Permissions**: Granular access control per lock
- **Audit Logs**: System action tracking
- **Refresh Tokens**: Secure token rotation system
- **Project/City Tenancy**: Multi-tenant architecture support (planned)

## 📂 Folder Structure

### Backend (`/backend`)

```
src/
├── controllers/     # Route handlers (auth, users, locks, dashboard, etc.)
├── services/        # Business logic layer
├── middleware/      # Auth, validation, rate limiting, error handling
├── routes/          # API route definitions
├── lib/             # Utilities (Prisma client, WebSocket, scoping)
├── jobs/            # Background tasks (key expiry job)
├── config/          # Database and tenant configuration
├── types/           # TypeScript type definitions
└── __tests__/       # Jest test suites

prisma/
├── schema.prisma    # Database schema
├── migrations/      # Database migration history
└── seed.ts          # Initial data seeding

scripts/             # Database utilities and tenant operations
```

### Frontend (`/rfid-frontend`)

```
src/
├── components/      # React components (Dashboard, UserManagement, etc.)
├── pages/           # Page-level components (LocationDetails)
├── contexts/        # React contexts (Auth, City, Tenant, Toast)
├── hooks/           # Custom React hooks (useAuth, useWebSocket)
├── services/        # API clients and WebSocket setup
├── utils/           # Utility functions (RBAC, helpers)
└── test/            # Test utilities and setup
```

## 🎨 Frontend Features

### Authentication & Navigation

- **City-aware Login**: Users select city + username/password
- **Role-based Navigation**: Dynamic menu based on user permissions
- **Protected Routes**: Route guards enforcing role-based access
- **Token Management**: Automatic refresh token rotation

### Core Components

- **Dashboard**: Real-time KPIs with city scoping and location-specific metrics
- **User Management**: CRUD operations with pagination, sorting, CSV export
- **Access Logs**: Filterable access attempt history with export capabilities
- **Audit Logs**: System action tracking for compliance
- **Lock Management**: Device status monitoring and configuration
- **Location Details**: Comprehensive location view with Users/Locks/Keys tabs

### Advanced Features

- **Bulk Operations**: CSV-based bulk permission management and key assignment
- **Real-time Updates**: WebSocket integration for live notifications
- **Toast Notifications**: User feedback system
- **CSV Export/Import**: Data exchange capabilities with template downloads
- **Responsive Design**: Tailwind CSS-based mobile-friendly UI

### State Management

- **TanStack Query**: Server state caching and synchronization
- **Context Providers**: Auth state, city selection, tenant management
- **Local Storage**: Token persistence and user preferences

## ⚙️ Backend Features

### API Architecture

- **RESTful Design**: 11 main route groups with consistent patterns
- **City Scoping**: All data filtered by user's assigned city
- **Role-based Access Control**: 4-tier permission system
- **Input Validation**: Joi and Express-validator for request validation
- **Error Handling**: Centralized error middleware with structured responses

### Core Controllers

- **Auth Controller**: Login, logout, profile, password management, refresh tokens
- **Dashboard Controller**: City-scoped KPIs and location-specific metrics
- **User Controller**: User CRUD with city filtering and CSV export
- **Lock Controller**: Device management and access attempt processing
- **RFID Controller**: Key lifecycle management (assign/revoke/update)
- **Permission Controller**: Access control assignment and bulk operations
- **Access Controller**: Access log querying and statistics
- **Audit Controller**: System action logging and retrieval

### Security & Performance

- **Rate Limiting**: Tiered limits (general: 300/15min, auth: 20/5min, bulk: 10/1min)
- **JWT Security**: Access tokens (1d) + refresh tokens with rotation
- **Database Optimization**: Strategic indexing for city, project, and time-based queries
- **Background Jobs**: Automatic RFID key expiry processing (5-minute intervals)

### WebSocket Integration

- **Real-time Events**: Key expiry, assignment, revocation notifications
- **City-scoped Rooms**: Users only receive events for their city
- **Authentication**: JWT-based WebSocket authentication

## 🔗 Integrations

### External Dependencies

- **Twilio SMS** (Planned): SMS notifications and 2FA implementation
- **PostgreSQL**: Primary database with advanced indexing
- **Docker**: Containerized deployment with docker-compose
- **GitHub Actions**: CI/CD pipeline for testing and building

### API Communication

- **Axios Interceptors**: Automatic token refresh and error handling
- **CORS Configuration**: Environment-specific origin allowlisting
- **Request/Response Standardization**: Consistent API response format
- **WebSocket Protocol**: Socket.io for real-time bidirectional communication

### Data Exchange

- **CSV Import/Export**: User data, access logs, and bulk operations
- **JSON API**: RESTful endpoints with pagination and filtering
- **File Upload**: Multer-based file handling for bulk operations

### Planned Integrations

- **Email Notifications**: SMTP integration for alerts and reports
- **Redis Caching**: Dashboard performance optimization
- **Tenant System**: Project+City multi-tenancy model

## 📝 Overall Summary

### What the App Does

The RFID Asset Access Control System is a **comprehensive security management platform** designed for organizations managing physical access to multiple locations across Netherlands cities. It provides:

1. **Physical Access Control**: RFID card-based entry to smart locks
2. **User Management**: Role-based user administration with city scoping
3. **Real-time Monitoring**: Live dashboard showing access attempts, device status, and user activity
4. **Audit Compliance**: Comprehensive logging of all system actions and access attempts
5. **Bulk Operations**: Efficient management of permissions and key assignments via CSV

### Target Users

- **Building Managers**: Monitor and control access to facilities
- **Security Personnel**: Track access attempts and investigate incidents
- **System Administrators**: Manage users, roles, and system configuration
- **Compliance Officers**: Generate audit reports and access statistics

### User Interaction Flow

1. **Login**: City-specific authentication with role-based permissions
2. **Dashboard**: Overview of city-scoped KPIs and location status
3. **Management**: User, lock, and permission administration
4. **Monitoring**: Real-time access logs and audit trail review
5. **Bulk Operations**: CSV-based bulk permission and key management
6. **Location Details**: Drill-down view of specific addresses with full management capabilities

### Key Strengths

- **City-aware Architecture**: Multi-location support with proper data isolation
- **Real-time Capabilities**: WebSocket integration for live updates
- **Comprehensive Auditing**: Full action tracking for compliance
- **Bulk Operations**: Efficient management of large datasets
- **Role-based Security**: Granular permission system
- **Modern Tech Stack**: TypeScript, React, and modern tooling

### Current Limitations

- **Notification System**: Twilio integration present but not implemented
- **Tenant Model**: Project+City architecture designed but not implemented
- **Frontend Testing**: Limited test coverage on React components
- **Caching Layer**: No Redis implementation for dashboard optimization
- **2FA**: SMS-based two-factor authentication designed but not implemented

### Architecture Highlights

#### Database Design

The system uses a well-structured PostgreSQL schema with:

- **Multi-tenant ready**: Project+City model for future expansion
- **Audit trail**: Complete action logging with metadata
- **Flexible permissions**: Time-bound access control per lock
- **RFID lifecycle**: Full key management with expiration tracking
- **Geographic organization**: City-based data partitioning

#### Security Implementation

- **JWT with rotation**: Secure access and refresh token handling
- **Rate limiting**: Tiered protection against abuse
- **Role-based access**: 4-level permission hierarchy
- **Input validation**: Comprehensive request sanitization
- **Audit logging**: Complete action tracking for compliance

#### Real-time Features

- **WebSocket integration**: Live notifications and updates
- **City-scoped events**: Isolated communication channels
- **Background jobs**: Automated maintenance tasks
- **Dashboard KPIs**: Real-time metrics and statistics

The system represents a **production-ready foundation** for RFID access control with significant room for enhancement through the planned notification system, full tenant model implementation, and expanded testing coverage.

---

_Report generated on September 20, 2025_
_Based on codebase analysis of asset-access-control project_
