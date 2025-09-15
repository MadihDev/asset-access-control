# RFID Access Control System - Architecture & Runtime Guide

This document combines the target system design with a quick runtime snapshot of the current repository so you can run and verify the app quickly.

## Quick Runtime Facts (current project state)

- Backend API: `http://localhost:5001`
- Frontend (Vite): typically `http://localhost:5173` (Vite may auto-pick `5174` if busy)
- Database: PostgreSQL 17 on `localhost:5433`, DB name `rfid_access_control`
- ORM: Prisma 5 (client generated)
- CSS: Tailwind CSS v4 with PostCSS pipeline

### Run commands (Windows PowerShell)

```powershell
# Backend
cd backend
npm install
npm run dev  # or: npx tsx src/index.ts

# Frontend
cd ..\rfid-frontend
npm install
npm run dev
```

### Tailwind v4 note
- `postcss.config.js` uses `@tailwindcss/postcss`
- `src/index.css` uses `@import "tailwindcss";` (v4 style)
- `tailwind.config.js` scans `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`

To verify styling loads, open the app in the browser and look for elements with Tailwind classes (e.g., white rounded cards with shadows in User Management, gradient background on Login). If it looks unstyled, hard refresh (Ctrl+F5) and ensure `src/main.tsx` imports `./index.css`.

---

## Backend Folder Structure (target design)

```
backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts          # Login, register, JWT refresh
│   │   ├── user.controller.ts          # User CRUD operations
│   │   ├── location.controller.ts      # City/Address/Lock management
│   │   ├── permission.controller.ts    # RFID key assignments
│   │   ├── access.controller.ts        # Access attempt handling
│   │   ├── audit.controller.ts         # Logs and reports
│   │   └── dashboard.controller.ts     # Statistics and overview
│   │
│   ├── services/
│   │   ├── auth.service.ts             # JWT token handling
│   │   ├── user.service.ts             # User business logic
│   │   ├── location.service.ts         # Hierarchy management
│   │   ├── permission.service.ts       # Access control logic
│   │   ├── access.service.ts           # RFID validation
│   │   ├── audit.service.ts            # Logging and reporting
│   │   ├── notification.service.ts     # SMS/Email alerts
│   │   └── cache.service.ts            # Redis caching
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts          # JWT verification
│   │   ├── role.middleware.ts          # Permission checking
│   │   ├── validation.middleware.ts    # Input validation
│   │   ├── ratelimit.middleware.ts     # API rate limiting
│   │   ├── audit.middleware.ts         # Request logging
│   │   └── error.middleware.ts         # Error handling
│   │
│   ├── models/
│   │   ├── schema.prisma               # Database schema
│   │   ├── user.model.ts               # User interfaces
│   │   ├── location.model.ts           # Location interfaces
│   │   ├── permission.model.ts         # Permission interfaces
│   │   └── audit.model.ts              # Audit log interfaces
│   │
│   ├── routes/
│   │   ├── auth.routes.ts              # /api/auth/*
│   │   ├── users.routes.ts             # /api/users/*
│   │   ├── locations.routes.ts         # /api/locations/*
│   │   ├── permissions.routes.ts       # /api/permissions/*
│   │   ├── access.routes.ts            # /api/access/*
│   │   ├── audit.routes.ts             # /api/audit/*
│   │   └── dashboard.routes.ts         # /api/dashboard/*
│   │
│   ├── websockets/
│   │   ├── connection.handler.ts       # WebSocket setup
│   │   ├── auth.handler.ts             # Socket authentication
│   │   ├── access.handler.ts           # Real-time access events
│   │   └── notification.handler.ts     # Live notifications
│   │
│   ├── jobs/
│   │   ├── cleanup.job.ts              # Database maintenance
│   │   ├── reports.job.ts              # Scheduled reports
│   │   └── notifications.job.ts        # Alert processing
│   │
│   ├── utils/
│   │   ├── encryption.util.ts          # Password hashing
│   │   ├── validation.util.ts          # Input validators
│   │   ├── date.util.ts                # Date formatting
│   │   ├── permissions.util.ts         # Access control helpers
│   │   └── logger.util.ts              # Logging utilities
│   │
│   ├── config/
│   │   ├── database.config.ts          # Prisma setup
│   │   ├── redis.config.ts             # Cache configuration
│   │   ├── websocket.config.ts         # Socket.io setup
│   │   ├── jwt.config.ts               # Token configuration
│   │   └── app.config.ts               # Application settings
│   │
│   ├── types/
│   │   ├── auth.types.ts               # Authentication types
│   │   ├── user.types.ts               # User-related types
│   │   ├── location.types.ts           # Location hierarchy types
│   │   ├── permission.types.ts         # Access control types
│   │   ├── audit.types.ts              # Logging types
│   │   └── api.types.ts                # API response types
│   │
│   └── index.ts                        # Application entry point
│
├── prisma/
│   ├── schema.prisma                   # Database schema
│   ├── migrations/                     # Database migrations
│   └── seed.ts                         # Initial data
│
├── tests/
│   ├── unit/                           # Unit tests
│   ├── integration/                    # API tests
│   └── e2e/                           # End-to-end tests
│
├── docker/
│   ├── Dockerfile                      # Container definition
│   ├── docker-compose.yml             # Multi-container setup
│   └── nginx.conf                      # Reverse proxy config
│
├── docs/
│   ├── api.md                          # API documentation
│   ├── deployment.md                   # Deployment guide
│   └── architecture.md                 # System architecture
│
├── .env.example                        # Environment template
├── .gitignore                          # Git ignore rules
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
├── eslint.config.js                    # ESLint rules
├── prettier.config.js                  # Prettier formatting
└── README.md                           # Project documentation
```

### Backend - current snapshot (this repo)

```
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── types/
│   └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── package.json
├── tsconfig.json
└── .env               # DATABASE_URL uses port 5433; PORT=5001
```

---

## Frontend Folder Structure (target design)

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Layout/                 # App layout wrapper
│   │   │   ├── Navigation/             # Main navigation
│   │   │   ├── Sidebar/                # Sidebar menu
│   │   │   ├── Header/                 # Top header
│   │   │   ├── Footer/                 # Page footer
│   │   │   ├── LoadingSpinner/         # Loading indicator
│   │   │   ├── ErrorBoundary/          # Error handling
│   │   │   ├── Modal/                  # Modal dialog
│   │   │   ├── DataTable/              # Reusable table
│   │   │   ├── SearchBar/              # Search component
│   │   │   ├── Pagination/             # Page navigation
│   │   │   └── ConfirmDialog/          # Confirmation popup
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm/              # User login
│   │   │   ├── RegisterForm/           # User registration
│   │   │   ├── ForgotPassword/         # Password reset
│   │   │   ├── ProfileSettings/        # User profile
│   │   │   └── ChangePassword/         # Password change
│   │   │
│   │   ├── dashboard/
│   │   │   ├── Overview/               # Main dashboard
│   │   │   ├── StatsCards/             # Statistic widgets
│   │   │   ├── AccessChart/            # Access analytics
│   │   │   ├── RecentActivity/         # Latest events
│   │   │   ├── QuickActions/           # Common actions
│   │   │   └── SystemHealth/           # System status
│   │   │
│   │   ├── locations/
│   │   │   ├── CityManager/            # City CRUD
│   │   │   ├── AddressManager/         # Address CRUD
│   │   │   ├── LockManager/            # Lock CRUD
│   │   │   ├── LocationTree/           # Hierarchical view
│   │   │   ├── LocationForm/           # Add/Edit locations
│   │   │   └── LocationDetails/        # Location info
│   │   │
│   │   ├── users/
│   │   │   ├── UserList/               # All users table
│   │   │   ├── UserForm/               # Add/Edit user
│   │   │   ├── UserDetails/            # User profile view
│   │   │   ├── UserSearch/             # User search
│   │   │   └── UserImport/             # Bulk user import
│   │   │
│   │   ├── permissions/
│   │   │   ├── PermissionMatrix/       # Access grid
│   │   │   ├── RFIDKeyManager/         # RFID card assignment
│   │   │   ├── AccessLevelForm/        # Permission levels
│   │   │   ├── BulkPermissions/        # Mass assignments
│   │   │   └── PermissionHistory/      # Change history
│   │   │
│   │   ├── audit/
│   │   │   ├── AccessLogs/             # Access attempt logs
│   │   │   ├── AuditReport/            # Detailed reports
│   │   │   ├── LogFilters/             # Search filters
│   │   │   ├── ExportData/             # Data export
│   │   │   └── LogAnalytics/           # Usage analytics
│   │   │
│   │   └── real-time/
│   │       ├── LiveMonitor/            # Real-time access
│   │       ├── AlertCenter/            # Active alerts
│   │       ├── SystemStatus/           # Device status
│   │       └── EventStream/            # Live event feed
│   │
│   ├── pages/
│   │   ├── Dashboard/                  # Main dashboard page
│   │   ├── Login/                      # Login page
│   │   ├── Users/                      # User management
│   │   ├── Locations/                  # Location management
│   │   ├── Permissions/                # Permission management
│   │   ├── Audit/                      # Audit and logs
│   │   ├── Settings/                   # System settings
│   │   └── Profile/                    # User profile
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                  # Authentication hook
│   │   ├── useApi.ts                   # API calling hook
│   │   ├── useWebSocket.ts             # Real-time updates
│   │   ├── useLocalStorage.ts          # Local storage
│   │   ├── useDebounce.ts              # Input debouncing
│   │   ├── usePagination.ts            # Table pagination
│   │   └── usePermissions.ts           # User permissions
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── auth.service.ts         # Auth API calls
│   │   │   ├── user.service.ts         # User API calls
│   │   │   ├── location.service.ts     # Location API calls
│   │   │   ├── permission.service.ts   # Permission API calls
│   │   │   ├── audit.service.ts        # Audit API calls
│   │   │   └── dashboard.service.ts    # Dashboard API calls
│   │   ├── websocket.service.ts        # WebSocket client
│   │   ├── storage.service.ts          # Local storage
│   │   ├── notification.service.ts     # Notifications
│   │   └── export.service.ts           # Data export
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx             # Authentication state
│   │   ├── ThemeContext.tsx            # UI theme
│   │   ├── NotificationContext.tsx     # App notifications
│   │   ├── PermissionContext.tsx       # User permissions
│   │   └── WebSocketContext.tsx        # Real-time connection
│   │
│   ├── types/
│   │   ├── auth.types.ts               # Auth interfaces
│   │   ├── user.types.ts               # User interfaces
│   │   ├── location.types.ts           # Location interfaces
│   │   ├── permission.types.ts         # Permission interfaces
│   │   ├── audit.types.ts              # Audit interfaces
│   │   ├── api.types.ts                # API response types
│   │   └── common.types.ts             # Shared types
│   │
│   ├── utils/
│   │   ├── validation.utils.ts         # Form validation
│   │   ├── format.utils.ts             # Data formatting
│   │   ├── date.utils.ts               # Date operations
│   │   ├── export.utils.ts             # Data export
│   │   ├── permissions.utils.ts        # Permission checks
│   │   └── constants.ts                # App constants
│   │
│   ├── styles/
│   │   ├── globals.css                 # Global styles
│   │   ├── components.css              # Component styles
│   │   ├── utilities.css               # Utility classes
│   │   └── themes/                     # Theme definitions
│   │
│   └── assets/
│       ├── images/                     # Static images
│       ├── icons/                      # Icon files
│       └── fonts/                      # Custom fonts
│
├── public/
│   ├── index.html                      # HTML template
│   ├── favicon.ico                     # App icon
│   └── manifest.json                   # PWA manifest
│
├── tests/
│   ├── components/                     # Component tests
│   ├── hooks/                          # Hook tests
│   ├── services/                       # Service tests
│   └── e2e/                           # End-to-end tests
│
├── .env.example                        # Environment template
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
├── tailwind.config.js                  # Tailwind CSS
├── vite.config.ts                      # Vite configuration
└── README.md                           # Project documentation
```

### Frontend - current snapshot (this repo)

The frontend lives under `rfid-frontend/` (not `frontend/`).

```
rfid-frontend/
├── index.html
├── src/
│   ├── App.tsx
│   ├── main.tsx           # imports ./index.css
│   ├── index.css          # Tailwind v4: @import "tailwindcss";
│   ├── components/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Navigation.tsx
│   │   ├── UserManagement.tsx
│   │   ├── AccessLogs.tsx
│   │   └── Settings.tsx
├── tailwind.config.js
├── postcss.config.js      # uses @tailwindcss/postcss
├── vite.config.ts
└── package.json
```