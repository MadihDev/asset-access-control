# 🔌 **Asset Access Control System - API Documentation**

## 📋 **Overview**

The Asset Access Control System provides a comprehensive REST API for managing RFID-based access control across multiple tenants, cities, and locations. This API supports multi-tenant isolation, role-based access control, and real-time monitoring capabilities.

**Base URL:** `http://localhost:5000/api` (Development)  
**Authentication:** JWT Bearer Token  
**Content-Type:** `application/json`

---

## 🔐 **Authentication**

### **Login**

Authenticate a user and receive JWT tokens.

```http
POST /api/auth/login
```

**Request Body:**

```json
{
  "username": "string",
  "password": "string",
  "projectId": "string", // Project slug or ID
  "cityName": "string" // City name for tenant scoping
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "ADMIN|SUPERVISOR|USER",
    "isActive": true,
    "projectCityId": "uuid"
  },
  "accessToken": "jwt_token",
  "refreshToken": "jwt_token"
}
```

**Error Responses:**

- `400` - Invalid credentials or missing tenant information
- `401` - Authentication failed
- `403` - Account inactive or access denied

### **Refresh Token**

Refresh the access token using a valid refresh token.

```http
POST /api/auth/refresh
```

**Headers:**

```
Authorization: Bearer <refresh_token>
```

**Response (200):**

```json
{
  "success": true,
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

### **Logout**

Invalidate tokens and end the session.

```http
POST /api/auth/logout
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 🔒 **Lock Management**

### **List Locks**

Retrieve all locks within the user's tenant scope.

```http
GET /api/lock
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50)
- `status` (optional) - Filter by status: `active|inactive|online|offline`
- `locationId` (optional) - Filter by location ID
- `search` (optional) - Search by lock name or device ID

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "deviceId": "string",
      "lockType": "ELECTRONIC|MAGNETIC|MECHANICAL",
      "isActive": true,
      "isOnline": true,
      "lastSeen": "2025-09-27T10:30:00Z",
      "location": {
        "id": "uuid",
        "name": "string",
        "address": {
          "id": "uuid",
          "street": "string",
          "number": "string",
          "zipCode": "string"
        }
      },
      "permissions": {
        "count": 5,
        "activeCount": 3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### **Get Lock Tree**

Retrieve hierarchical lock data organized by address and location.

```http
GET /api/lock/tree
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "street": "Main Street",
      "number": "123",
      "zipCode": "1000AB",
      "city": {
        "name": "Amsterdam",
        "country": "Netherlands"
      },
      "locations": [
        {
          "id": "uuid",
          "name": "Ground Floor",
          "description": "Main entrance area",
          "locks": [
            {
              "id": "uuid",
              "name": "Main Door",
              "deviceId": "LOCK_001",
              "isActive": true,
              "isOnline": true,
              "lastSeen": "2025-09-27T10:30:00Z",
              "lockType": "ELECTRONIC",
              "permissionCount": 5
            }
          ],
          "stats": {
            "totalLocks": 3,
            "onlineLocks": 2,
            "activeLocks": 3
          }
        }
      ],
      "stats": {
        "totalLocks": 8,
        "onlineLocks": 6,
        "activeLocks": 8,
        "totalLocations": 3
      }
    }
  ],
  "summary": {
    "totalAddresses": 2,
    "totalLocations": 5,
    "totalLocks": 15,
    "onlineLocks": 12,
    "activeLocks": 15
  }
}
```

### **Get Lock Details**

Retrieve detailed information about a specific lock.

```http
GET /api/lock/:id
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "deviceId": "string",
    "secretKey": "string",
    "lockType": "ELECTRONIC|MAGNETIC|MECHANICAL",
    "isActive": true,
    "isOnline": true,
    "lastSeen": "2025-09-27T10:30:00Z",
    "createdAt": "2025-09-20T08:00:00Z",
    "updatedAt": "2025-09-27T10:30:00Z",
    "location": {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "address": {
        "id": "uuid",
        "street": "string",
        "number": "string",
        "zipCode": "string",
        "city": {
          "name": "string",
          "country": "string"
        }
      }
    },
    "permissions": [
      {
        "id": "uuid",
        "userId": "uuid",
        "canAccess": true,
        "validFrom": "2025-09-20T00:00:00Z",
        "validUntil": "2025-12-31T23:59:59Z",
        "user": {
          "id": "uuid",
          "firstName": "string",
          "lastName": "string",
          "email": "string"
        }
      }
    ],
    "recentAccessLogs": [
      {
        "id": "uuid",
        "timestamp": "2025-09-27T10:15:00Z",
        "accessGranted": true,
        "user": {
          "firstName": "string",
          "lastName": "string"
        },
        "rfidKey": {
          "cardId": "string"
        }
      }
    ]
  }
}
```

### **Ping Lock**

Test connection to a specific lock.

```http
POST /api/lock/:id/ping
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Lock ping successful",
  "data": {
    "lockId": "uuid",
    "isOnline": true,
    "responseTime": 156,
    "lastSeen": "2025-09-27T10:30:00Z",
    "deviceStatus": "HEALTHY|WARNING|ERROR",
    "batteryLevel": 85
  }
}
```

### **Update Lock**

Update lock settings and configuration.

```http
PUT /api/lock/:id
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "name": "string",
  "isActive": true,
  "lockType": "ELECTRONIC|MAGNETIC|MECHANICAL"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Lock updated successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "isActive": true,
    "lockType": "ELECTRONIC",
    "updatedAt": "2025-09-27T10:30:00Z"
  }
}
```

### **Create Lock**

Add a new lock to the system.

```http
POST /api/lock
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "name": "string",
  "deviceId": "string",
  "secretKey": "string",
  "lockType": "ELECTRONIC|MAGNETIC|MECHANICAL",
  "locationId": "uuid",
  "isActive": true
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Lock created successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "deviceId": "string",
    "lockType": "ELECTRONIC",
    "isActive": true,
    "locationId": "uuid",
    "createdAt": "2025-09-27T10:30:00Z"
  }
}
```

---

## 👥 **User Management**

### **List Users**

Retrieve all users within the current tenant scope.

```http
GET /api/user
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50)
- `role` (optional) - Filter by role: `ADMIN|SUPERVISOR|USER`
- `active` (optional) - Filter by active status: `true|false`
- `search` (optional) - Search by name, username, or email

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "ADMIN|SUPERVISOR|USER",
      "isActive": true,
      "createdAt": "2025-09-20T08:00:00Z",
      "lastLoginAt": "2025-09-27T09:00:00Z",
      "permissions": {
        "count": 5,
        "activeCount": 3
      },
      "rfidKeys": {
        "count": 2,
        "activeCount": 1
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  }
}
```

### **Get User Details**

Retrieve detailed information about a specific user.

```http
GET /api/user/:id
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "ADMIN|SUPERVISOR|USER",
    "isActive": true,
    "createdAt": "2025-09-20T08:00:00Z",
    "lastLoginAt": "2025-09-27T09:00:00Z",
    "projectCity": {
      "id": "uuid",
      "project": {
        "name": "string",
        "slug": "string"
      },
      "city": {
        "name": "string",
        "country": "string"
      }
    },
    "permissions": [
      {
        "id": "uuid",
        "lockId": "uuid",
        "canAccess": true,
        "validFrom": "2025-09-20T00:00:00Z",
        "validUntil": "2025-12-31T23:59:59Z",
        "lock": {
          "name": "string",
          "deviceId": "string",
          "location": {
            "name": "string"
          }
        }
      }
    ],
    "rfidKeys": [
      {
        "id": "uuid",
        "cardId": "string",
        "isActive": true,
        "expiresAt": "2025-12-31T23:59:59Z",
        "createdAt": "2025-09-20T08:00:00Z"
      }
    ]
  }
}
```

### **Create User**

Add a new user to the system.

```http
POST /api/user
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "username": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "password": "string",
  "role": "ADMIN|SUPERVISOR|USER",
  "isActive": true
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "USER",
    "isActive": true,
    "createdAt": "2025-09-27T10:30:00Z"
  }
}
```

### **Update User**

Update user information and settings.

```http
PUT /api/user/:id
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "role": "ADMIN|SUPERVISOR|USER",
  "isActive": true
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "uuid",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "role": "USER",
    "isActive": true,
    "updatedAt": "2025-09-27T10:30:00Z"
  }
}
```

### **Deactivate User**

Deactivate a user account.

```http
DELETE /api/user/:id
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

---

## 📍 **Location Management**

### **List Locations**

Retrieve all locations within the current tenant scope.

```http
GET /api/location
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `addressId` (optional) - Filter by address ID
- `search` (optional) - Search by location name

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "address": {
        "id": "uuid",
        "street": "string",
        "number": "string",
        "zipCode": "string",
        "city": {
          "name": "string",
          "country": "string"
        }
      },
      "locks": {
        "count": 3,
        "activeCount": 3,
        "onlineCount": 2
      }
    }
  ]
}
```

### **Get Location Tree**

Retrieve hierarchical location data organized by address.

```http
GET /api/location/tree
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "street": "string",
      "number": "string",
      "zipCode": "string",
      "city": {
        "name": "string",
        "country": "string"
      },
      "locations": [
        {
          "id": "uuid",
          "name": "string",
          "description": "string",
          "lockCount": 3
        }
      ]
    }
  ]
}
```

### **Create Location**

Add a new location to an existing address.

```http
POST /api/location
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "name": "string",
  "description": "string",
  "addressId": "uuid"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Location created successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "addressId": "uuid",
    "createdAt": "2025-09-27T10:30:00Z"
  }
}
```

---

## 🎯 **Access Control**

### **Record Access Attempt**

Record an RFID access attempt.

```http
POST /api/lock/access-attempt
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "lockId": "uuid",
  "cardId": "string",
  "timestamp": "2025-09-27T10:30:00Z"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Access attempt recorded",
  "data": {
    "id": "uuid",
    "lockId": "uuid",
    "userId": "uuid",
    "cardId": "string",
    "accessGranted": true,
    "timestamp": "2025-09-27T10:30:00Z",
    "reason": "VALID_PERMISSION|EXPIRED_PERMISSION|INVALID_CARD|INACTIVE_USER"
  }
}
```

### **Get Access Logs**

Retrieve access attempt history.

```http
GET /api/lock/access-logs
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `lockId` (optional) - Filter by lock ID
- `userId` (optional) - Filter by user ID
- `from` (optional) - Start date (ISO 8601)
- `to` (optional) - End date (ISO 8601)
- `granted` (optional) - Filter by access granted: `true|false`
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "timestamp": "2025-09-27T10:30:00Z",
      "accessGranted": true,
      "lock": {
        "id": "uuid",
        "name": "string",
        "deviceId": "string",
        "location": {
          "name": "string",
          "address": {
            "street": "string",
            "number": "string"
          }
        }
      },
      "user": {
        "id": "uuid",
        "firstName": "string",
        "lastName": "string",
        "email": "string"
      },
      "rfidKey": {
        "cardId": "string"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 500,
    "totalPages": 10
  }
}
```

### **Get Access Statistics**

Retrieve access statistics and analytics.

```http
GET /api/lock/access-stats
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `period` (optional) - Time period: `today|week|month|quarter|year`
- `lockId` (optional) - Filter by lock ID
- `userId` (optional) - Filter by user ID

**Response (200):**

```json
{
  "success": true,
  "data": {
    "period": "week",
    "totalAttempts": 1250,
    "successfulAttempts": 1180,
    "failedAttempts": 70,
    "successRate": 94.4,
    "peakHours": [
      {
        "hour": 9,
        "attempts": 150
      },
      {
        "hour": 17,
        "attempts": 145
      }
    ],
    "dailyBreakdown": [
      {
        "date": "2025-09-21",
        "attempts": 180,
        "successful": 170
      }
    ],
    "topUsers": [
      {
        "userId": "uuid",
        "name": "John Doe",
        "attempts": 45,
        "successful": 44
      }
    ],
    "topLocks": [
      {
        "lockId": "uuid",
        "name": "Main Entrance",
        "attempts": 230,
        "successful": 225
      }
    ]
  }
}
```

---

## 🛡️ **Admin Operations**

### **Get System Health**

Check the overall system health and status.

```http
GET /api/admin/health
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Server is up and running!",
  "data": {
    "timestamp": "2025-09-27T10:30:00Z",
    "uptime": 3600000,
    "version": "2.1.0",
    "environment": "development",
    "database": {
      "status": "connected",
      "connectionCount": 5,
      "responseTime": 12
    },
    "redis": {
      "status": "connected",
      "responseTime": 3
    },
    "locks": {
      "total": 150,
      "online": 142,
      "offline": 8,
      "healthPercentage": 94.7
    },
    "users": {
      "total": 75,
      "active": 68,
      "inactive": 7
    }
  }
}
```

### **Get Audit Logs**

Retrieve system audit logs for administrative oversight.

```http
GET /api/admin/audit
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `action` (optional) - Filter by action type
- `userId` (optional) - Filter by user ID
- `from` (optional) - Start date (ISO 8601)
- `to` (optional) - End date (ISO 8601)
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action": "USER_CREATED|USER_UPDATED|LOCK_ACCESSED|PERMISSION_GRANTED",
      "description": "string",
      "userId": "uuid",
      "targetId": "uuid",
      "targetType": "USER|LOCK|PERMISSION|RFID_KEY",
      "metadata": {
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "changes": {
          "field": "value"
        }
      },
      "timestamp": "2025-09-27T10:30:00Z",
      "user": {
        "firstName": "string",
        "lastName": "string",
        "email": "string"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2500,
    "totalPages": 50
  }
}
```

---

## 📝 **Data Models**

### **User Object**

```typescript
{
  id: string;              // UUID
  username: string;        // Unique username
  email: string;           // Unique email
  firstName: string;       // User's first name
  lastName: string;        // User's last name
  role: 'ADMIN' | 'SUPERVISOR' | 'USER';
  isActive: boolean;       // Account status
  projectCityId: string;   // Tenant scope
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
  lastLoginAt?: string;    // ISO 8601 timestamp
}
```

### **Lock Object**

```typescript
{
  id: string;              // UUID
  name: string;            // Display name
  deviceId: string;        // Unique device identifier
  secretKey: string;       // Device authentication key
  lockType: 'ELECTRONIC' | 'MAGNETIC' | 'MECHANICAL';
  isActive: boolean;       // Lock status
  isOnline: boolean;       // Connection status
  lastSeen?: string;       // ISO 8601 timestamp
  locationId: string;      // Parent location
  projectCityId: string;   // Tenant scope
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

### **Permission Object**

```typescript
{
  id: string;              // UUID
  userId: string;          // User reference
  lockId: string;          // Lock reference
  canAccess: boolean;      // Permission status
  validFrom?: string;      // ISO 8601 timestamp
  validUntil?: string;     // ISO 8601 timestamp
  projectCityId: string;   // Tenant scope
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

### **Access Log Object**

```typescript
{
  id: string;              // UUID
  lockId: string;          // Lock reference
  userId?: string;         // User reference (if identified)
  cardId?: string;         // RFID card identifier
  accessGranted: boolean;  // Access result
  timestamp: string;       // ISO 8601 timestamp
  projectCityId: string;   // Tenant scope
  metadata?: object;       // Additional context
}
```

---

## ⚠️ **Error Handling**

### **Standard Error Response**

```json
{
  "success": false,
  "error": "Error message",
  "details": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ],
  "timestamp": "2025-09-27T10:30:00Z",
  "path": "/api/endpoint"
}
```

### **HTTP Status Codes**

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (business logic error)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

---

## 🔐 **Security & Authentication**

### **JWT Token Structure**

```json
{
  "sub": "user_id",
  "username": "string",
  "role": "ADMIN|SUPERVISOR|USER",
  "projectCityId": "uuid",
  "iat": 1695798000,
  "exp": 1695801600
}
```

### **Required Headers**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### **Rate Limiting**

- **Authentication endpoints:** 10 requests per minute per IP
- **General API endpoints:** 100 requests per minute per user
- **Admin endpoints:** 50 requests per minute per admin user

---

## 📊 **Webhook Events** _(Future Enhancement)_

The system will support webhook notifications for real-time events:

### **Access Events**

- `access.granted` - Successful access attempt
- `access.denied` - Failed access attempt
- `lock.offline` - Lock goes offline
- `lock.online` - Lock comes online

### **User Events**

- `user.created` - New user added
- `user.updated` - User information changed
- `user.deactivated` - User account deactivated

### **System Events**

- `system.alert` - System health alert
- `permission.expired` - User permission expired

---

**Last Updated:** September 27, 2025  
**API Version:** 2.1  
**Documentation Status:** Complete

This API documentation provides comprehensive coverage of all available endpoints, data models, and integration patterns for the Asset Access Control System. 🔌✨
