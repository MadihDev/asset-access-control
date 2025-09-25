# 🏗️ RFID Asset Access Control System - Architecture Diagrams

**Generated on:** September 22, 2025  
**Repository:** MadihDev/asset-access-control  
**Branch:** main

This document provides comprehensive system architecture diagrams including sequence diagrams, class diagrams, and system interaction flows for the RFID Asset Access Control System.

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Authentication & Authorization Flows](#authentication--authorization-flows)
3. [Access Control Sequences](#access-control-sequences)
4. [Real-time Communication](#real-time-communication)
5. [Class Diagrams](#class-diagrams)
6. [Database Entity Relationships](#database-entity-relationships)
7. [Component Architecture](#component-architecture)

---

## 🌐 System Overview

### High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        MOB[Mobile App - Future]
    end

    subgraph "Load Balancer & Gateway"
        LB[Load Balancer/Nginx]
        API_GW[API Gateway]
    end

    subgraph "Application Layer"
        BE[Backend API Server]
        WS[WebSocket Server]
        JOBS[Background Jobs]
    end

    subgraph "Service Layer"
        AUTH[Auth Service]
        RFID[RFID Service]
        NOTIF[Notification Service]
        AUDIT[Audit Service]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL)]
        REDIS[(Redis Cache)]
        FILES[File Storage]
    end

    subgraph "External Services"
        TWILIO[Twilio SMS]
        EMAIL[Email Provider]
        MONITORING[Monitoring/Logs]
    end

    subgraph "IoT Layer"
        LOCK1[Smart Lock 1]
        LOCK2[Smart Lock 2]
        LOCKN[Smart Lock N]
    end

    WEB --> LB
    MOB --> LB
    LB --> API_GW
    API_GW --> BE
    API_GW --> WS

    BE --> AUTH
    BE --> RFID
    BE --> NOTIF
    BE --> AUDIT

    AUTH --> DB
    RFID --> DB
    AUDIT --> DB

    BE --> REDIS
    WS --> REDIS
    JOBS --> REDIS

    NOTIF --> TWILIO
    NOTIF --> EMAIL

    BE --> MONITORING

    LOCK1 -.-> BE
    LOCK2 -.-> BE
    LOCKN -.-> BE
```

---

## 🔐 Authentication & Authorization Flows

### 1. User Login with 2FA Sequence

```mermaid
sequenceDiagram
    participant C as Client (Frontend)
    participant A as Auth Controller
    participant AS as Auth Service
    participant T as TwoFactor Service
    participant DB as Database
    participant SMS as Twilio SMS
    participant AU as Audit Service

    Note over C,AU: Multi-Factor Authentication Flow

    C->>A: POST /api/auth/login
    Note right of C: {username, password, projectId, cityName}

    A->>AS: login(credentials)

    AS->>DB: findProjectCity(project, city)
    DB-->>AS: projectCity data

    AS->>DB: findUser(username, projectCityId)
    DB-->>AS: user data

    AS->>AS: bcrypt.compare(password, hashedPassword)

    alt Password Valid & 2FA Required
        AS->>T: createChallenge(userId, phone)
        T->>DB: save 2FA challenge
        T->>SMS: send SMS code
        SMS-->>T: delivery confirmation
        T-->>AS: challenge created
        AS-->>A: {requiresTwoFactor: true, challengeId}
        A-->>C: 200 OK {requiresTwoFactor: true}

        Note over C: User enters SMS code

        C->>A: POST /api/auth/2fa/verify
        Note right of C: {challengeId, code}

        A->>T: verifyChallenge(challengeId, code)
        T->>DB: get challenge data
        T->>T: bcrypt.compare(code, hashedCode)

        alt 2FA Code Valid
            T->>DB: mark challenge as used
            T-->>A: verification successful

            A->>AS: generateTokens(user)
            AS->>AS: jwt.sign(payload, secret)
            AS->>DB: save refresh token
            AS-->>A: {accessToken, refreshToken}

            A->>AU: log(LOGIN, userId)
            AU->>DB: save audit log

            A-->>C: 200 OK {user, tokens}
        else 2FA Code Invalid
            T->>DB: increment attempt count
            T-->>A: verification failed
            A-->>C: 401 Unauthorized
        end

    else Password Invalid
        AS-->>A: authentication failed
        A-->>C: 401 Unauthorized
    end
```

### 2. Token Refresh Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth Controller
    participant AS as Auth Service
    participant DB as Database
    participant R as Redis Cache

    Note over C,R: JWT Token Refresh Flow

    C->>A: POST /api/auth/refresh-token
    Note right of C: {refreshToken}

    A->>AS: refreshToken(token)

    AS->>DB: findRefreshToken(token)
    DB-->>AS: token data

    AS->>AS: validate token expiry

    alt Token Valid
        AS->>AS: generateNewTokens(user)
        AS->>DB: revoke old refresh token
        AS->>DB: save new refresh token

        AS->>R: cache user session

        AS-->>A: {accessToken, refreshToken}
        A-->>C: 200 OK {tokens}
    else Token Invalid/Expired
        AS->>DB: revoke token (if exists)
        AS-->>A: refresh failed
        A-->>C: 401 Unauthorized
    end
```

---

## 🚪 Access Control Sequences

### 1. RFID Key Access Attempt

```mermaid
sequenceDiagram
    participant L as Smart Lock
    participant A as Access Controller
    participant AS as Access Service
    participant PS as Permission Service
    participant DB as Database
    participant WS as WebSocket
    participant C as Connected Clients

    Note over L,C: Physical Access Attempt Flow

    L->>A: POST /api/access/attempt
    Note right of L: {lockId, cardId, deviceInfo}

    A->>AS: processAccessAttempt(data)

    AS->>DB: findRFIDKey(cardId)
    DB-->>AS: RFID key data

    alt RFID Key Found & Active
        AS->>DB: findUser(keyUserId)
        DB-->>AS: user data

        AS->>PS: checkPermission(userId, lockId)
        PS->>DB: findUserPermission(userId, lockId)
        DB-->>PS: permission data

        alt Permission Granted & Valid
            PS->>PS: validateTimeRestriction()
            PS->>PS: validateExpiryDate()

            alt All Validations Pass
                PS-->>AS: ACCESS_GRANTED
                AS->>DB: logAccessAttempt(GRANTED)
                AS->>WS: broadcast access event
                WS->>C: real-time notification
                AS-->>A: {result: GRANTED, unlock: true}
                A-->>L: 200 OK {unlock: true}

            else Time/Expiry Validation Failed
                PS-->>AS: ACCESS_DENIED_TIME_RESTRICTION
                AS->>DB: logAccessAttempt(DENIED_TIME_RESTRICTION)
                AS-->>A: {result: DENIED_TIME_RESTRICTION}
                A-->>L: 403 Forbidden
            end

        else No Permission
            PS-->>AS: ACCESS_DENIED_NO_PERMISSION
            AS->>DB: logAccessAttempt(DENIED_NO_PERMISSION)
            AS-->>A: {result: DENIED_NO_PERMISSION}
            A-->>L: 403 Forbidden
        end

    else RFID Key Invalid/Inactive
        AS->>DB: logAccessAttempt(DENIED_INVALID_CARD)
        AS-->>A: {result: DENIED_INVALID_CARD}
        A-->>L: 401 Unauthorized
    end
```

### 2. User Permission Management

```mermaid
sequenceDiagram
    participant U as Admin User
    participant P as Permission Controller
    participant PS as Permission Service
    participant DB as Database
    participant WS as WebSocket
    participant A as Audit Service

    Note over U,A: Permission Grant/Revoke Flow

    U->>P: POST /api/permission/grant
    Note right of U: {userId, lockId, validFrom, validTo}

    P->>P: authenticate & authorize admin

    P->>PS: grantPermission(data)

    PS->>DB: findUser(userId)
    PS->>DB: findLock(lockId)

    alt User & Lock Valid
        PS->>DB: upsertUserPermission(permission)
        DB-->>PS: permission created/updated

        PS->>WS: broadcast permission change
        PS-->>P: permission granted

        P->>A: log(PERMISSION_GRANT, userId, lockId)
        A->>DB: save audit log

        P-->>U: 200 OK {permission}

    else User/Lock Not Found
        PS-->>P: entity not found
        P-->>U: 404 Not Found
    end

    Note over U,A: Permission Revocation

    U->>P: DELETE /api/permission/:permissionId

    P->>PS: revokePermission(permissionId)

    PS->>DB: updatePermission(canAccess: false)
    DB-->>PS: permission revoked

    PS->>WS: broadcast permission change
    PS-->>P: permission revoked

    P->>A: log(PERMISSION_REVOKE, userId, lockId)
    P-->>U: 200 OK
```

---

## 🔄 Real-time Communication

### WebSocket Event Broadcasting

```mermaid
sequenceDiagram
    participant C1 as Client 1
    participant C2 as Client 2
    participant WS as WebSocket Server
    participant R as Redis Pub/Sub
    participant BE as Backend Service
    participant DB as Database

    Note over C1,DB: Real-time Event Broadcasting

    C1->>WS: connect with JWT token
    C2->>WS: connect with JWT token

    WS->>WS: authenticate connections
    WS->>R: subscribe to channels

    Note over BE,DB: Backend Event Occurs

    BE->>DB: RFID key expires
    BE->>R: publish key.expired event

    R->>WS: receive key.expired event

    WS->>WS: filter by tenant scope

    alt Client in same tenant
        WS->>C1: emit key.expired
        WS->>C2: emit key.expired

        C1->>C1: show notification
        C2->>C2: refresh dashboard
    end

    Note over BE,DB: Access Event Occurs

    BE->>DB: access attempt logged
    BE->>R: publish access.created event

    R->>WS: receive access.created
    WS->>C1: emit access.created
    WS->>C2: emit access.created

    C1->>C1: update access logs
    C2->>C2: update dashboard KPIs
```

---

## 📊 Class Diagrams

### 1. Authentication Domain

```mermaid
classDiagram
    class AuthController {
        +login(req: Request, res: Response): Promise~void~
        +logout(req: Request, res: Response): Promise~void~
        +refreshToken(req: Request, res: Response): Promise~void~
        +verify2FA(req: Request, res: Response): Promise~void~
        +resend2FA(req: Request, res: Response): Promise~void~
        +changePassword(req: Request, res: Response): Promise~void~
        +getProfile(req: Request, res: Response): Promise~void~
    }

    class AuthService {
        -jwtSecret: string
        -jwtExpiresIn: string
        -refreshExpiresIn: string
        +login(loginData: LoginRequest): Promise~LoginResponse~
        +logout(userId: string): Promise~void~
        +validateToken(token: string): Promise~User~
        +refreshToken(refreshToken: string): Promise~TokenResponse~
        +changePassword(userId: string, data: ChangePasswordRequest): Promise~void~
        +resetPassword(email: string): Promise~void~
        -generateTokens(user: User): TokenPair
        -generateJWT(payload: JWTPayload): string
    }

    class TwoFactorService {
        -CODE_LENGTH: number
        -DEFAULT_TTL_SEC: number
        -DEFAULT_MAX_ATTEMPTS: number
        +createChallenge(userId: string, phone: string): Promise~TwoFactorChallengeResponse~
        +verifyChallenge(challengeId: string, code: string): Promise~TwoFactorVerificationResult~
        +resendChallenge(challengeId: string): Promise~TwoFactorChallengeResponse~
        +cleanupExpiredChallenges(): Promise~void~
        -generateCode(): string
        -sendSMSCode(phone: string, code: string): Promise~void~
    }

    class User {
        +id: string
        +email: string
        +username: string
        +firstName: string
        +lastName: string
        +password: string
        +role: UserRole
        +isActive: boolean
        +projectCityId?: string
        +phone?: string
        +twoFactorEnabled: boolean
        +twoFactorVerifiedAt?: DateTime
        +createdAt: DateTime
        +updatedAt: DateTime
        +lastLoginAt?: DateTime
    }

    class RefreshToken {
        +id: string
        +jti: string
        +userId: string
        +isRevoked: boolean
        +expiresAt: DateTime
        +createdAt: DateTime
        +replacedById?: string
    }

    class TwoFactorChallenge {
        +id: string
        +userId: string
        +codeHash: string
        +expiresAt: DateTime
        +attempts: number
        +maxAttempts: number
        +method: string
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    AuthController --> AuthService
    AuthController --> TwoFactorService
    AuthService --> User
    AuthService --> RefreshToken
    TwoFactorService --> User
    TwoFactorService --> TwoFactorChallenge
    User ||--o{ RefreshToken : "has many"
    User ||--o{ TwoFactorChallenge : "has many"
```

### 2. Access Control Domain

```mermaid
classDiagram
    class AccessController {
        +processAccess(req: Request, res: Response): Promise~void~
        +getAccessLogs(req: Request, res: Response): Promise~void~
        +exportAccessLogs(req: Request, res: Response): Promise~void~
    }

    class AccessService {
        +processAccessAttempt(data: AccessAttemptRequest): Promise~AccessResult~
        +logAccess(logData: AccessLogData): Promise~AccessLog~
        +getAccessLogs(filters: AccessLogFilters): Promise~AccessLog[]~
        +exportAccessLogs(filters: AccessLogFilters): Promise~string~
        -validateAccessPermission(userId: string, lockId: string): Promise~boolean~
        -checkTimeRestrictions(permission: UserPermission): boolean
    }

    class PermissionService {
        +grantPermission(data: GrantPermissionRequest): Promise~UserPermission~
        +revokePermission(permissionId: string): Promise~void~
        +getUserPermissions(userId: string): Promise~UserPermission[]~
        +getLockPermissions(lockId: string): Promise~UserPermission[]~
        +checkAccess(userId: string, lockId: string): Promise~AccessCheckResult~
        +bulkGrantPermissions(data: BulkPermissionRequest): Promise~UserPermission[]~
        +bulkRevokePermissions(userIds: string[], lockIds: string[]): Promise~void~
    }

    class RFIDService {
        +assignKey(data: AssignKeyRequest): Promise~RFIDKey~
        +revokeKey(keyId: string): Promise~void~
        +getUserKeys(userId: string): Promise~RFIDKey[]~
        +validateKey(cardId: string): Promise~RFIDKey | null~
        +processKeyExpiry(): Promise~void~
        +bulkAssignKeys(data: BulkAssignRequest): Promise~RFIDKey[]~
    }

    class Lock {
        +id: string
        +name: string
        +description?: string
        +deviceId: string
        +secretKey: string
        +lockType: LockType
        +isActive: boolean
        +isOnline: boolean
        +lastSeen?: DateTime
        +addressId: string
        +projectCityId?: string
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class RFIDKey {
        +id: string
        +cardId: string
        +name?: string
        +isActive: boolean
        +issuedAt: DateTime
        +expiresAt?: DateTime
        +userId: string
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class UserPermission {
        +id: string
        +userId: string
        +lockId: string
        +canAccess: boolean
        +validFrom: DateTime
        +validTo?: DateTime
        +projectCityId?: string
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class AccessLog {
        +id: string
        +accessType: AccessType
        +result: AccessResult
        +timestamp: DateTime
        +deviceInfo?: Json
        +metadata?: Json
        +userId?: string
        +rfidKeyId?: string
        +lockId: string
        +projectCityId?: string
    }

    AccessController --> AccessService
    AccessController --> PermissionService
    AccessService --> RFIDService
    AccessService --> Lock
    AccessService --> AccessLog
    PermissionService --> UserPermission
    RFIDService --> RFIDKey

    User ||--o{ UserPermission : "has many"
    User ||--o{ RFIDKey : "has many"
    Lock ||--o{ UserPermission : "has many"
    Lock ||--o{ AccessLog : "has many"
    RFIDKey ||--o{ AccessLog : "has many"
    User ||--o{ AccessLog : "has many"
```

### 3. Multi-Tenant Architecture

```mermaid
classDiagram
    class Project {
        +id: string
        +name: string
        +slug: string
        +isActive: boolean
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class City {
        +id: string
        +name: string
        +country: string
        +isActive: boolean
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class ProjectCity {
        +id: string
        +projectId: string
        +cityId: string
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class Address {
        +id: string
        +street: string
        +number: string
        +zipCode: string
        +isActive: boolean
        +cityId: string
        +projectCityId?: string
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class TenantScopeService {
        +getEffectiveProjectCityId(req: Request): string | undefined
        +getUserScope(user: User): string | undefined
        +validateTenantAccess(user: User, resourceId: string): boolean
        +applyScopeFilter(query: any, scope: string): any
    }

    Project ||--o{ ProjectCity : "has many"
    City ||--o{ ProjectCity : "has many"
    ProjectCity ||--o{ User : "scopes"
    ProjectCity ||--o{ Address : "scopes"
    ProjectCity ||--o{ Lock : "scopes"
    ProjectCity ||--o{ UserPermission : "scopes"
    ProjectCity ||--o{ AccessLog : "scopes"
    City ||--o{ Address : "contains"
    Address ||--o{ Lock : "contains"

    TenantScopeService --> ProjectCity
    TenantScopeService --> User
```

---

## 🗄️ Database Entity Relationships

### Complete ERD

```mermaid
erDiagram
    PROJECT {
        string id PK
        string name UK
        string slug UK
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    CITY {
        string id PK
        string name UK
        string country
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    PROJECT_CITY {
        string id PK
        string projectId FK
        string cityId FK
        datetime createdAt
        datetime updatedAt
    }

    USER {
        string id PK
        string email UK
        string username UK
        string firstName
        string lastName
        string password
        enum role
        boolean isActive
        string projectCityId FK
        string phone
        boolean twoFactorEnabled
        datetime twoFactorVerifiedAt
        string createdById FK
        datetime createdAt
        datetime updatedAt
        datetime lastLoginAt
    }

    ADDRESS {
        string id PK
        string street
        string number
        string zipCode
        boolean isActive
        string cityId FK
        string projectCityId FK
        datetime createdAt
        datetime updatedAt
    }

    LOCK {
        string id PK
        string name
        string description
        string deviceId UK
        string secretKey
        enum lockType
        boolean isActive
        boolean isOnline
        datetime lastSeen
        string addressId FK
        string projectCityId FK
        datetime createdAt
        datetime updatedAt
    }

    RFID_KEY {
        string id PK
        string cardId UK
        string name
        boolean isActive
        datetime issuedAt
        datetime expiresAt
        string userId FK
        datetime createdAt
        datetime updatedAt
    }

    USER_PERMISSION {
        string id PK
        string userId FK
        string lockId FK
        boolean canAccess
        datetime validFrom
        datetime validTo
        string projectCityId FK
        datetime createdAt
        datetime updatedAt
    }

    ACCESS_LOG {
        string id PK
        enum accessType
        enum result
        datetime timestamp
        json deviceInfo
        json metadata
        string userId FK
        string rfidKeyId FK
        string lockId FK
        string projectCityId FK
    }

    AUDIT_LOG {
        string id PK
        enum action
        string entityType
        string entityId
        json oldValues
        json newValues
        string ipAddress
        string userAgent
        datetime timestamp
        string userId FK
    }

    REFRESH_TOKEN {
        string id PK
        string jti UK
        string userId FK
        boolean isRevoked
        datetime createdAt
        datetime expiresAt
        string replacedById FK
    }

    TWO_FACTOR_CHALLENGE {
        string id PK
        string userId FK
        string codeHash
        datetime expiresAt
        int attempts
        int maxAttempts
        string method
        datetime createdAt
        datetime updatedAt
    }

    SYSTEM_CONFIG {
        string id PK
        string key UK
        string value
        string type
    }

    NOTIFICATION_TEMPLATE {
        string id PK
        string name UK
        enum type
        string subject
        string body
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    %% Relationships
    PROJECT ||--o{ PROJECT_CITY : "has"
    CITY ||--o{ PROJECT_CITY : "has"
    PROJECT_CITY ||--o{ USER : "scopes"
    PROJECT_CITY ||--o{ ADDRESS : "scopes"
    PROJECT_CITY ||--o{ LOCK : "scopes"
    PROJECT_CITY ||--o{ USER_PERMISSION : "scopes"
    PROJECT_CITY ||--o{ ACCESS_LOG : "scopes"

    CITY ||--o{ ADDRESS : "contains"
    ADDRESS ||--o{ LOCK : "contains"

    USER ||--o{ RFID_KEY : "owns"
    USER ||--o{ USER_PERMISSION : "has"
    USER ||--o{ ACCESS_LOG : "creates"
    USER ||--o{ AUDIT_LOG : "creates"
    USER ||--o{ REFRESH_TOKEN : "has"
    USER ||--o{ TWO_FACTOR_CHALLENGE : "has"
    USER ||--o{ USER : "creates"

    LOCK ||--o{ USER_PERMISSION : "grants"
    LOCK ||--o{ ACCESS_LOG : "logs"

    RFID_KEY ||--o{ ACCESS_LOG : "used_in"

    REFRESH_TOKEN ||--o| REFRESH_TOKEN : "replaces"
```

---

## 🧩 Component Architecture

### Frontend Component Hierarchy

```mermaid
graph TD
    subgraph "App Layer"
        APP[App.tsx]
        ROUTER[React Router]
        AUTH_PROVIDER[AuthProvider]
        QUERY_CLIENT[React Query Client]
    end

    subgraph "Layout Components"
        NAV[Navigation.tsx]
        PROTECTED[ProtectedRoute.tsx]
        TOAST[Toast.tsx]
    end

    subgraph "Page Components"
        DASHBOARD[Dashboard.tsx]
        LOGIN[Login.tsx]
        USER_MGMT[UserManagement.tsx]
        ACCESS_LOGS[AccessLogs.tsx]
        AUDIT_LOGS[AuditLogs.tsx]
        LOCKS[Locks.tsx]
        SETTINGS[Settings.tsx]
        LOCATION_DETAILS[LocationDetails.tsx]
    end

    subgraph "UI Components"
        BUTTON[Button]
        INPUT[Input]
        MODAL[Modal]
        TABLE[Table]
        FORM[Form]
        CARD[Card]
    end

    subgraph "Hooks & Services"
        USE_AUTH[useAuth]
        USE_WEBSOCKET[useWebSocket]
        USE_TENANT[useTenantScope]
        API_SERVICE[api.ts]
        WEBSOCKET_SERVICE[websocket.ts]
    end

    subgraph "Contexts"
        CITY_CONTEXT[CityContext]
        AUTH_CONTEXT[AuthContext]
    end

    APP --> ROUTER
    APP --> AUTH_PROVIDER
    APP --> QUERY_CLIENT

    ROUTER --> NAV
    ROUTER --> PROTECTED

    PROTECTED --> DASHBOARD
    PROTECTED --> USER_MGMT
    PROTECTED --> ACCESS_LOGS
    PROTECTED --> AUDIT_LOGS
    PROTECTED --> LOCKS
    PROTECTED --> SETTINGS
    PROTECTED --> LOCATION_DETAILS

    DASHBOARD --> CARD
    DASHBOARD --> TABLE
    USER_MGMT --> FORM
    USER_MGMT --> MODAL
    ACCESS_LOGS --> TABLE

    LOGIN --> FORM
    LOGIN --> INPUT
    LOGIN --> BUTTON

    USE_AUTH --> API_SERVICE
    USE_WEBSOCKET --> WEBSOCKET_SERVICE
    USE_TENANT --> API_SERVICE

    AUTH_PROVIDER --> AUTH_CONTEXT
    CITY_CONTEXT --> USE_TENANT

    DASHBOARD --> USE_AUTH
    DASHBOARD --> USE_WEBSOCKET
    USER_MGMT --> USE_AUTH
    ACCESS_LOGS --> USE_AUTH
```

### Backend Service Architecture

```mermaid
graph TD
    subgraph "API Layer"
        EXPRESS[Express App]
        MIDDLEWARE[Middleware Stack]
        ROUTES[Route Handlers]
    end

    subgraph "Controller Layer"
        AUTH_CTRL[AuthController]
        USER_CTRL[UserController]
        LOCK_CTRL[LockController]
        ACCESS_CTRL[AccessController]
        DASHBOARD_CTRL[DashboardController]
        PERMISSION_CTRL[PermissionController]
        RFID_CTRL[RFIDController]
        AUDIT_CTRL[AuditController]
    end

    subgraph "Service Layer"
        AUTH_SVC[AuthService]
        USER_SVC[UserService]
        ACCESS_SVC[AccessService]
        PERMISSION_SVC[PermissionService]
        RFID_SVC[RFIDService]
        NOTIFICATION_SVC[NotificationService]
        TWOFACTOR_SVC[TwoFactorService]
        AUDIT_SVC[AuditService]
    end

    subgraph "Data Access Layer"
        PRISMA[Prisma Client]
        REDIS[Redis Client]
        FILE_STORAGE[File Storage]
    end

    subgraph "External Services"
        TWILIO_API[Twilio SMS]
        EMAIL_API[Email Service]
        WEBSOCKET[Socket.IO]
    end

    subgraph "Background Jobs"
        KEY_EXPIRY[Key Expiry Job]
        CLEANUP[Cleanup Job]
        NOTIFICATION_QUEUE[Notification Queue]
    end

    EXPRESS --> MIDDLEWARE
    MIDDLEWARE --> ROUTES
    ROUTES --> AUTH_CTRL
    ROUTES --> USER_CTRL
    ROUTES --> LOCK_CTRL
    ROUTES --> ACCESS_CTRL
    ROUTES --> DASHBOARD_CTRL
    ROUTES --> PERMISSION_CTRL
    ROUTES --> RFID_CTRL
    ROUTES --> AUDIT_CTRL

    AUTH_CTRL --> AUTH_SVC
    AUTH_CTRL --> TWOFACTOR_SVC
    USER_CTRL --> USER_SVC
    LOCK_CTRL --> ACCESS_SVC
    ACCESS_CTRL --> ACCESS_SVC
    DASHBOARD_CTRL --> ACCESS_SVC
    PERMISSION_CTRL --> PERMISSION_SVC
    RFID_CTRL --> RFID_SVC
    AUDIT_CTRL --> AUDIT_SVC

    AUTH_SVC --> PRISMA
    USER_SVC --> PRISMA
    ACCESS_SVC --> PRISMA
    PERMISSION_SVC --> PRISMA
    RFID_SVC --> PRISMA
    AUDIT_SVC --> PRISMA

    AUTH_SVC --> REDIS
    NOTIFICATION_SVC --> TWILIO_API
    NOTIFICATION_SVC --> EMAIL_API
    TWOFACTOR_SVC --> NOTIFICATION_SVC

    ACCESS_SVC --> WEBSOCKET
    RFID_SVC --> WEBSOCKET

    KEY_EXPIRY --> RFID_SVC
    CLEANUP --> AUDIT_SVC
    NOTIFICATION_QUEUE --> NOTIFICATION_SVC
```

---

## 🔄 Data Flow Diagrams

### Request-Response Flow

```mermaid
flowchart TD
    START([Client Request]) --> AUTH{Authenticated?}
    AUTH -->|No| LOGIN[Redirect to Login]
    AUTH -->|Yes| AUTHORIZE{Authorized?}

    AUTHORIZE -->|No| FORBIDDEN[403 Forbidden]
    AUTHORIZE -->|Yes| VALIDATE[Validate Input]

    VALIDATE -->|Invalid| BAD_REQUEST[400 Bad Request]
    VALIDATE -->|Valid| TENANT[Apply Tenant Scope]

    TENANT --> BUSINESS[Business Logic]
    BUSINESS --> DATABASE[Database Operation]

    DATABASE -->|Success| AUDIT[Log Audit Trail]
    DATABASE -->|Error| ERROR_HANDLER[Error Handler]

    AUDIT --> WEBSOCKET[Broadcast Events]
    WEBSOCKET --> RESPONSE[Send Response]

    ERROR_HANDLER --> LOG[Log Error]
    LOG --> ERROR_RESPONSE[Error Response]

    LOGIN --> END([End])
    FORBIDDEN --> END
    BAD_REQUEST --> END
    RESPONSE --> END
    ERROR_RESPONSE --> END
```

---

This comprehensive diagram documentation provides a complete technical overview of the RFID Asset Access Control System architecture, covering all major components, interactions, and data flows. The diagrams are designed to be both technically accurate and visually clear for developers, architects, and stakeholders.

## 📚 Diagram Legend

- **Solid arrows**: Direct method calls or data flow
- **Dashed arrows**: Asynchronous operations or events
- **Rectangles**: Components/Services
- **Diamonds**: Decision points
- **Cylinders**: Data stores
- **Circles**: Start/End points

---

**Document Version:** 1.0  
**Last Updated:** September 22, 2025  
**Maintained By:** Development Team
