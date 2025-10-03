/**
 * Authentication Constants
 */

// Local Storage Keys
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_DATA: 'auth_user_data',
  REMEMBER_ME: 'auth_remember_me',
  LAST_PROJECT: 'auth_last_project',
  LAST_CITY: 'auth_last_city',
} as const;

// API Endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  TWO_FACTOR_VERIFY: '/auth/2fa/verify',
  TWO_FACTOR_SETUP: '/auth/2fa/setup',
  HEALTH: '/health',
  // Public endpoints for login form (no auth required)
  PUBLIC_PROJECTS: '/public/projects',
  PUBLIC_CITIES: '/public/cities',
  PUBLIC_CITIES_FOR_PROJECT: '/public/projects',  // + /:projectId/cities
  PUBLIC_VALIDATE_COMBO: '/public/validate-combo',
  // Legacy endpoints (keep for compatibility)
  PROJECTS: '/projects',
  CITIES: '/cities',
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9_.-]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
    SPECIAL_CHARS: '!@#$%^&*(),.?":{}|<>',
  },
  TWO_FACTOR_CODE: {
    LENGTH: 6,
    PATTERN: /^\d{6}$/,
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_USERNAME: 'Username must be 3-50 characters and contain only letters, numbers, dots, hyphens, and underscores',
  INVALID_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  INVALID_TWO_FACTOR_CODE: 'Two-factor code must be exactly 6 digits',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  INVALID_CREDENTIALS: 'Invalid username or password',
  ACCOUNT_INACTIVE: 'Your account has been deactivated. Please contact an administrator.',
  TWO_FACTOR_REQUIRED: 'Two-factor authentication is required',
  INVALID_TWO_FACTOR: 'Invalid two-factor authentication code',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  UNAUTHORIZED: 'You are not authorized to access this resource',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logged out successfully',
  TWO_FACTOR_SUCCESS: 'Two-factor authentication successful',
} as const;

// Token Configuration
export const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: 15 * 60 * 1000, // 15 minutes in milliseconds
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  REFRESH_THRESHOLD: 5 * 60 * 1000, // Refresh when 5 minutes left
} as const;

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  USER: 'USER',
} as const;

// Role Hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY = {
  [USER_ROLES.USER]: 1,
  [USER_ROLES.SUPERVISOR]: 2,
  [USER_ROLES.ADMIN]: 3,
  [USER_ROLES.SUPER_ADMIN]: 4,
} as const;