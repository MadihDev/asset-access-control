// TypeScript interfaces and types for the RFID Access Control System

export interface User {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  // Tenant scope (Project + City)
  projectCityId?: string
  projectId?: string
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

export enum UserRole {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  USER = 'USER'
}

export interface CreateUserRequest {
  email: string
  username: string
  firstName: string
  lastName: string
  password: string
  role?: UserRole
}

export interface UpdateUserRequest {
  email?: string
  username?: string
  firstName?: string
  lastName?: string
  role?: UserRole
  isActive?: boolean
}

export interface LoginRequest {
  username: string
  password: string
  projectId?: string
  cityName?: string
}

export interface LoginResponse {
  user: Omit<User, 'password'>
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface City {
  id: string
  name: string
  country: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Address {
  id: string
  street: string
  number: string
  zipCode: string
  isActive: boolean
  city: City
  cityId: string
  createdAt: Date
  updatedAt: Date
}

export interface Lock {
  id: string
  name: string
  description?: string
  deviceId: string
  lockType: LockType
  isActive: boolean
  isOnline: boolean
  lastSeen?: Date
  address: Address
  addressId: string
  createdAt: Date
  updatedAt: Date
}

export enum LockType {
  DOOR = 'DOOR',
  GATE = 'GATE',
  CABINET = 'CABINET',
  ROOM = 'ROOM'
}

export interface CreateLockRequest {
  name: string
  description?: string
  deviceId: string
  lockType: LockType
  addressId: string
}

export interface UpdateLockRequest {
  name?: string
  description?: string
  lockType?: LockType
  isActive?: boolean
  addressId?: string
}

export interface RFIDKey {
  id: string
  cardId: string
  name?: string
  isActive: boolean
  issuedAt: Date
  expiresAt?: Date
  user: User
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateRFIDKeyRequest {
  cardId: string
  name?: string
  userId: string
  expiresAt?: Date
}

export interface AssignRFIDKeyRequest {
  cardId: string
  userId: string
  name?: string
  expiresAt?: Date
}

export interface RevokeRFIDKeyRequest {
  id?: string
  cardId?: string
  reason?: string
}

export interface AccessLog {
  id: string
  accessType: AccessType
  result: AccessResult
  timestamp: Date
  deviceInfo?: Record<string, any>
  metadata?: Record<string, any>
  user?: User
  userId?: string
  rfidKey?: RFIDKey
  rfidKeyId?: string
  lock: Lock
  lockId: string
}

export enum AccessType {
  RFID_CARD = 'RFID_CARD',
  MANUAL = 'MANUAL',
  EMERGENCY = 'EMERGENCY',
  MAINTENANCE = 'MAINTENANCE'
}

export enum AccessResult {
  GRANTED = 'GRANTED',
  DENIED_INVALID_CARD = 'DENIED_INVALID_CARD',
  DENIED_EXPIRED_CARD = 'DENIED_EXPIRED_CARD',
  DENIED_NO_PERMISSION = 'DENIED_NO_PERMISSION',
  DENIED_INACTIVE_USER = 'DENIED_INACTIVE_USER',
  DENIED_INACTIVE_LOCK = 'DENIED_INACTIVE_LOCK',
  DENIED_TIME_RESTRICTION = 'DENIED_TIME_RESTRICTION',
  ERROR_DEVICE_OFFLINE = 'ERROR_DEVICE_OFFLINE',
  ERROR_SYSTEM_FAILURE = 'ERROR_SYSTEM_FAILURE'
}

export interface AccessAttemptRequest {
  cardId: string
  lockId: string
  accessType?: AccessType
  deviceInfo?: Record<string, any>
  metadata?: Record<string, any>
}

export interface UserPermission {
  id: string
  canAccess: boolean
  validFrom: Date
  validTo?: Date
  user: User
  userId: string
  lock: Lock
  lockId: string
  createdAt: Date
  updatedAt: Date
}

export interface CreatePermissionRequest {
  userId: string
  lockId: string
  validFrom?: Date
  validTo?: Date
  canAccess?: boolean
}

export interface AuditLog {
  id: string
  action: AuditAction
  entityType: string
  entityId: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  user?: User
  userId?: string
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PERMISSION_GRANT = 'PERMISSION_GRANT',
  PERMISSION_REVOKE = 'PERMISSION_REVOKE',
  ACCESS_ATTEMPT = 'ACCESS_ATTEMPT'
}

export interface SystemConfig {
  id: string
  key: string
  value: string
  type: string
}

// Request query interfaces
export interface PaginationQuery {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface AccessLogQuery extends PaginationQuery {
  userId?: string
  lockId?: string
  addressId?: string
  result?: AccessResult
  accessType?: AccessType
  startDate?: string
  endDate?: string
  projectCityId?: string
}

export interface AuditLogQuery extends PaginationQuery {
  userId?: string
  action?: AuditAction
  entityType?: string
  startDate?: string
  endDate?: string
}

export interface UserQuery extends PaginationQuery {
  role?: UserRole
  isActive?: boolean
  search?: string
  projectCityId?: string
}

export interface LockQuery extends PaginationQuery {
  addressId?: string
  isActive?: boolean
  isOnline?: boolean
  lockType?: LockType
  search?: string
}

// Response wrappers
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Error types
export interface ValidationError {
  field: string
  message: string
}

export interface ApiError {
  code: string
  message: string
  details?: ValidationError[]
}

// JWT payload (legacy - being enhanced)
export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  // Tenant claims (project + city)
  projectCityId?: string
  projectId?: string
  // For refresh tokens we include a unique token id (jti)
  jti?: string
  iat?: number
  exp?: number
}

// Enhanced JWT payload with RFC 7519 compliance
export interface EnhancedJWTPayload {
  // Standard JWT Claims (RFC 7519)
  iss: string        // Issuer
  sub: string        // Subject (User ID)
  aud: string        // Audience
  exp: number        // Expiration Time
  nbf: number        // Not Before
  iat: number        // Issued At
  jti: string        // JWT ID

  // Custom Application Claims
  email: string
  role: string
  projectCityId?: string

  // Security Enhancement Claims
  scope: string[]    // User permissions/scope
  tenant?: string    // Tenant identifier
  sessionId: string  // Session tracking
  tokenType: 'access' | 'refresh'

  // Security metadata
  ipAddress?: string
  userAgent?: string
}

// Dashboard statistics
export interface DashboardStats {
  totalUsers: number
  totalLocks: number
  totalAccessAttempts: number
  successfulAccess: number
  failedAccess: number
  onlineLocks: number
  offlineLocks: number
  recentAccessLogs: AccessLog[]
  topUsers: Array<{
    user: User
    accessCount: number
  }>
  accessTrends: Array<{
    date: string
    successful: number
    failed: number
  }>
}

// Notification service types
export interface NotificationTemplate {
  id: string
  name: string
  type: 'EMAIL' | 'SMS'
  subject?: string
  body: string
  isActive: boolean
}

export interface SendNotificationRequest {
  to: string
  templateName: string
  variables?: Record<string, any>
}

export interface TwoFactorChallenge {
  id: string
  userId: string
  codeHash: string
  expiresAt: Date
  attempts: number
  maxAttempts: number
  method: 'sms' | 'totp'
  createdAt: Date
  updatedAt: Date
}

export interface TwoFactorVerifyRequest {
  challengeId: string
  code: string
}

export interface TwoFactorChallengeResponse {
  challengeId: string
  method: 'sms'
  maskedPhone: string
  expiresIn: number
}

// Device Management Types
export enum DeviceType {
  RFID_READER = 'RFID_READER',
  LOCK_CONTROLLER = 'LOCK_CONTROLLER',
  GATEWAY = 'GATEWAY',
  SENSOR = 'SENSOR'
}

export enum DeviceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR'
}

export interface Device {
  id: string
  name: string
  deviceId: string
  secretKey: string
  deviceType: DeviceType
  status: DeviceStatus
  firmwareVersion?: string
  ipAddress?: string
  macAddress?: string
  isOnline: boolean
  lastSeen?: Date
  lastPing?: Date
  batteryLevel?: number
  signalStrength?: number
  errorCount: number
  pingInterval: number
  configuration?: any
  metadata?: any
  locationId?: string
  projectCityId?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateDeviceRequest {
  name: string
  deviceId: string
  deviceType?: DeviceType
  locationId?: string
  ipAddress?: string
  macAddress?: string
  configuration?: any
  metadata?: any
}

export interface UpdateDeviceRequest {
  name?: string
  status?: DeviceStatus
  firmwareVersion?: string
  ipAddress?: string
  macAddress?: string
  batteryLevel?: number
  signalStrength?: number
  pingInterval?: number
  configuration?: any
  metadata?: any
  locationId?: string
}

export interface DeviceRegistrationRequest {
  deviceId: string
  secretKey: string
  deviceType: DeviceType
  name: string
  firmwareVersion?: string
  ipAddress?: string
  macAddress?: string
  locationId?: string
}

export interface DeviceCommand {
  id: string
  deviceId: string
  command: string
  parameters?: any
  status: 'PENDING' | 'SENT' | 'EXECUTED' | 'FAILED'
  sentAt?: Date
  executedAt?: Date
  response?: any
  error?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateDeviceCommandRequest {
  deviceId: string
  command: string
  parameters?: any
}

export interface DeviceHealthMetric {
  id: string
  deviceId: string
  metricType: string
  value: number
  unit?: string
  timestamp: Date
}

export interface DevicePingRequest {
  deviceId: string
  batteryLevel?: number
  signalStrength?: number
  firmwareVersion?: string
  status?: DeviceStatus
  metadata?: any
}

export interface DeviceCommandResponse {
  commandId: string
  success: boolean
  response?: any
  error?: string
  executedAt: Date
}

// Export all types from Prisma as well
export * from '@prisma/client'