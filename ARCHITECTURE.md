# 🏗️ **Asset Access Control System - Architecture Documentation**

## 📋 **System Overview**

A comprehensive **multi-tenant access control system** for managing RFID-based locks across multiple projects, cities, and locations. The system provides hierarchical access management, real-time monitoring, and secure administrative controls.

---

## 🏛️ **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    🌐 Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  📱 Web Application (Vite + TypeScript + Tailwind CSS)     │
│  ├── 🔐 Authentication & Authorization                     │
│  ├── 🌳 Hierarchical Lock Management (Tree + Table Views)  │
│  ├── 👥 User Management                                    │
│  ├── 📊 Real-time Dashboards                               │
│  └── 📱 Responsive Mobile-First Design                     │
└─────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴────────────┐
                    │    🔗 HTTP/REST API    │
                    └───────────┬────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                   ⚙️ Backend (Node.js)                     │
├─────────────────────────────────────────────────────────────┤
│  🖥️ Express.js Server (TypeScript)                         │
│  ├── 🔐 JWT Authentication & Role-Based Authorization      │
│  ├── 🏢 Multi-Tenant Isolation (Project → City → Address)  │
│  ├── 🔒 Lock Management & Control                          │
│  ├── 👤 User & Permission Management                       │
│  ├── 📈 Real-time Status Monitoring                        │
│  ├── 📝 Comprehensive Audit Logging                        │
│  └── 🔄 RESTful API with OpenAPI Documentation             │
└─────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴────────────┐
                    │   🗄️ Database Layer    │
                    └───────────┬────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                  🗃️ PostgreSQL Database                    │
├─────────────────────────────────────────────────────────────┤
│  📊 Prisma ORM (Type-Safe Database Access)                 │
│  ├── 🏢 Multi-Tenant Data Model                            │
│  ├── 🔐 Hierarchical Permission System                     │
│  ├── 🔒 Lock & Device Management                           │
│  ├── 👥 User & Role Management                             │
│  ├── 📝 Audit Trail & Access Logs                          │
│  └── 🔄 Database Migrations & Seeding                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ **Multi-Tenant Data Hierarchy**

```
🌍 System Level
├── 🏢 Project (Organization/Company)
│   ├── 🏙️ ProjectCity (Project presence in specific city)
│   │   ├── 📍 Address (Physical building/location)
│   │   │   ├── 🏢 Location (Room/Area within address)
│   │   │   │   ├── 🔒 Lock (Physical access control device)
│   │   │   │   ├── 👤 User (Person with access)
│   │   │   │   ├── 🎫 RFIDKey (Physical access card/tag)
│   │   │   │   └── 📋 Permission (User-Lock access rights)
│   │   │   └── 📊 AccessLog (Access attempts & results)
│   │   └── 🏛️ City (Geographic location)
│   └── 📈 AuditLog (System activity tracking)
```

### **Tenant Isolation Strategy:**

- **Project Level**: Complete data separation between organizations
- **City Level**: Geographic segregation within projects
- **Address Level**: Building-specific access control
- **Location Level**: Room/area granular permissions

---

## 🎯 **Core Features**

### **🔐 Authentication & Authorization**

- **JWT-based authentication** with refresh tokens
- **Role-based access control** (SUPER_ADMIN, ADMIN, SUPERVISOR, USER)
- **Multi-tenant isolation** with automatic scope enforcement
- **Session management** with configurable expiration

### **🌳 Hierarchical Lock Management**

- **Tree View Interface** - Geographic organization (Address → Location → Lock)
- **Table View Interface** - Traditional list with advanced filtering
- **Real-time Status Monitoring** - Online/offline and active/inactive states
- **Bulk Operations** - Ping all locks in location/address
- **Smart Search** - Multi-level filtering across hierarchy

### **👥 User Management**

- **Role-based permissions** with inheritance
- **RFID key assignment** and management
- **Time-based access control** (expiration dates)
- **Hybrid user display** (permissions + RFID keys)

### **📊 Real-time Monitoring**

- **Live lock status** updates
- **Connection health** monitoring
- **Access attempt** logging
- **System health** dashboards

---

## 🗄️ **Database Schema**

### **Core Entities:**

```typescript
// Multi-tenant hierarchy
Project {
  id: String (UUID)
  name: String
  slug: String (unique)
  isActive: Boolean
  projectCities: ProjectCity[]
}

ProjectCity {
  id: String (UUID)
  projectId: String
  cityId: String
  project: Project
  city: City
  users: User[]
  addresses: Address[]
}

City {
  id: String (UUID)
  name: String
  country: String
  isActive: Boolean
}

Address {
  id: String (UUID)
  street: String
  number: String
  zipCode: String
  projectCityId: String
  cityId: String
  locations: Location[]
}

Location {
  id: String (UUID)
  name: String
  description: String?
  addressId: String
  locks: Lock[]
}

Lock {
  id: String (UUID)
  name: String
  deviceId: String (unique)
  secretKey: String
  lockType: LockType
  isActive: Boolean
  isOnline: Boolean
  lastSeen: DateTime?
  locationId: String
  projectCityId: String
  permissions: Permission[]
}

User {
  id: String (UUID)
  username: String (unique)
  email: String (unique)
  firstName: String
  lastName: String
  role: UserRole
  isActive: Boolean
  projectCityId: String
  rfidKeys: RFIDKey[]
  permissions: Permission[]
}

Permission {
  id: String (UUID)
  userId: String
  lockId: String
  canAccess: Boolean
  validFrom: DateTime?
  validUntil: DateTime?
  timeSlots: TimeSlot[]
}

RFIDKey {
  id: String (UUID)
  rfidTag: String (unique)
  isActive: Boolean
  userId: String
  expiresAt: DateTime?
}

AccessLog {
  id: String (UUID)
  lockId: String
  userId: String?
  rfidTag: String?
  accessGranted: Boolean
  timestamp: DateTime
  projectCityId: String
}
```

---

## 🔌 **API Architecture**

### **RESTful Endpoints:**

```
Authentication:
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

Lock Management:
GET    /api/lock              # List locks (with tenant scope)
GET    /api/lock/tree         # Hierarchical lock data
GET    /api/lock/:id          # Get lock details
POST   /api/lock/:id/ping     # Ping lock (test connection)
PUT    /api/lock/:id          # Update lock settings
POST   /api/lock              # Create new lock

User Management:
GET    /api/user              # List users
GET    /api/user/:id          # Get user details
POST   /api/user              # Create user
PUT    /api/user/:id          # Update user
DELETE /api/user/:id          # Deactivate user

Location Management:
GET    /api/location          # List locations
GET    /api/location/tree     # Location hierarchy
POST   /api/location          # Create location

Access Control:
POST   /api/lock/access-attempt    # RFID access attempt
GET    /api/lock/access-logs       # Access history
GET    /api/lock/access-stats      # Access statistics

Admin Operations:
GET    /api/admin/audit            # System audit logs
GET    /api/admin/health           # System health check
```

### **Middleware Stack:**

1. **CORS** - Cross-origin resource sharing
2. **Helmet** - Security headers
3. **Rate Limiting** - API abuse prevention
4. **Request Logging** - Activity tracking
5. **Authentication** - JWT validation
6. **Tenant Scoping** - Automatic data isolation
7. **Role Authorization** - Permission validation
8. **Input Validation** - Request sanitization
9. **Error Handling** - Consistent error responses

---

## 🎨 **Frontend Architecture**

### **Technology Stack:**

- **React 18** - Component-based UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Heroicons** - Consistent icon library
- **React Query (TanStack)** - Server state management
- **React Router** - Client-side routing

### **Component Structure:**

```
src/
├── components/
│   ├── Auth/                    # Authentication components
│   │   ├── Login.tsx
│   │   └── ProtectedRoute.tsx
│   ├── Locations/               # Location management
│   │   ├── Locations.tsx
│   │   ├── AddressTree.tsx
│   │   └── LockManagementModal.tsx
│   ├── Locks/                   # Lock management
│   │   ├── Locks.tsx
│   │   ├── LockTreeView.tsx
│   │   └── DragDropLockReassignment.tsx
│   ├── Users/                   # User management
│   │   ├── Users.tsx
│   │   └── UserPermissionsModal.tsx
│   └── Dashboard/               # Dashboards
│       ├── Dashboard.tsx
│       └── StatsCards.tsx
├── hooks/                       # Custom React hooks
│   ├── useAuth.ts
│   ├── useTenantScope.ts
│   └── useToast.ts
├── services/                    # API services
│   ├── api.ts
│   └── auth.service.ts
├── types/                       # TypeScript definitions
│   └── index.ts
└── utils/                       # Utility functions
    └── helpers.ts
```

### **State Management Strategy:**

- **React Query** - Server state (API data, caching, synchronization)
- **React Context** - Global state (authentication, theme)
- **Component State** - Local UI state (forms, modals, toggles)
- **URL State** - Navigation and filters

---

## 🔒 **Security Architecture**

### **Authentication Flow:**

```
1. User submits credentials
2. Backend validates against database
3. JWT access token generated (15min expiry)
4. JWT refresh token generated (7 days expiry)
5. Tokens returned to client
6. Access token stored in memory
7. Refresh token stored in httpOnly cookie
8. Automatic token refresh before expiry
```

### **Authorization Layers:**

1. **Route-level** - Protected routes require authentication
2. **API-level** - Middleware validates JWT tokens
3. **Resource-level** - Tenant scoping enforces data isolation
4. **Action-level** - Role-based permission checks
5. **Field-level** - Sensitive data filtering by role

### **Multi-Tenant Security:**

- **Automatic Scoping** - All queries filtered by projectCityId
- **Data Isolation** - No cross-tenant data access
- **Permission Inheritance** - Role-based access control
- **Audit Logging** - All actions tracked with context

---

## 📈 **Performance Optimizations**

### **Database Level:**

- **Indexed Queries** - Optimized search performance
- **Connection Pooling** - Efficient database connections
- **Query Optimization** - Prisma query analysis
- **Batch Operations** - Bulk data operations

### **API Level:**

- **Response Caching** - Static data caching
- **Pagination** - Large dataset handling
- **Field Selection** - Minimal data transfer
- **Compression** - Gzip response compression

### **Frontend Level:**

- **Code Splitting** - Lazy loading of components
- **React Query Caching** - Intelligent data caching
- **Optimistic Updates** - Instant UI feedback
- **Virtual Scrolling** - Large list performance

---

## 🚀 **Deployment Architecture**

### **Development Environment:**

```
Local Development:
├── Backend: http://localhost:5000
├── Frontend: http://localhost:5174 (with proxy)
├── Database: PostgreSQL (local/Docker)
└── Development Tools: Hot reload, TypeScript checking
```

### **Production Recommendations:**

```
Production Stack:
├── Frontend: Static hosting (Vercel/Netlify/S3+CloudFront)
├── Backend: Node.js server (PM2/Docker)
├── Database: PostgreSQL (RDS/managed instance)
├── Reverse Proxy: Nginx (SSL termination, load balancing)
├── Monitoring: Application monitoring (DataDog/New Relic)
└── Logging: Centralized logging (ELK stack/CloudWatch)
```

---

## 🔄 **Integration Points**

### **External Systems:**

- **RFID Hardware** - Lock communication protocols
- **Building Management** - HVAC, lighting integration
- **Security Systems** - Camera, alarm integration
- **Identity Providers** - LDAP/Active Directory
- **Notification Services** - Email, SMS, push notifications

### **API Integration Patterns:**

- **Webhook Support** - Real-time event notifications
- **Bulk Import/Export** - Data migration capabilities
- **Third-party Authentication** - OAuth2/SAML integration
- **Mobile App Support** - REST API compatibility

---

## 📊 **Monitoring & Observability**

### **Application Metrics:**

- **Performance Monitoring** - Response times, throughput
- **Error Tracking** - Exception monitoring and alerting
- **User Analytics** - Usage patterns and behavior
- **Security Monitoring** - Failed login attempts, suspicious activity

### **Business Metrics:**

- **Lock Usage Statistics** - Access patterns, peak times
- **User Activity** - Login frequency, feature usage
- **System Health** - Lock connectivity, uptime
- **Tenant Metrics** - Per-organization usage statistics

---

## 🔮 **Future Enhancements**

### **Planned Features:**

- **🔓 Remote Lock Opening** - Administrative override capabilities
- **📱 Mobile Application** - Native iOS/Android apps
- **🤖 API Automation** - Advanced scripting capabilities
- **📊 Advanced Analytics** - Machine learning insights
- **🌐 Multi-language Support** - Internationalization
- **🔄 Real-time Notifications** - WebSocket/SSE implementation

### **Scalability Considerations:**

- **Microservices Migration** - Service-oriented architecture
- **Event-Driven Architecture** - Async processing capabilities
- **Caching Layer** - Redis/Memcached integration
- **CDN Integration** - Global content delivery
- **Horizontal Scaling** - Load balancer configuration

---

## 📚 **Documentation Structure**

```
Documentation:
├── ARCHITECTURE.md (This file)
├── API_DOCUMENTATION.md
├── DEPLOYMENT_GUIDE.md
├── DEVELOPER_SETUP.md
├── USER_MANUAL.md
├── SECURITY_GUIDELINES.md
└── TROUBLESHOOTING.md
```

---

**Last Updated:** September 27, 2025  
**Version:** 2.1  
**System Status:** Production Ready - Cleaned & Optimized

This architecture supports a scalable, secure, and maintainable multi-tenant access control system with modern development practices and comprehensive feature set. 🏗️✨
