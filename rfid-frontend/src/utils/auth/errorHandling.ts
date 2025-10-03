/**
 * Authentication Error Handling Utilities
 */

import { ERROR_MESSAGES } from './constants';
import type { ApiError } from '../../types/auth';

/**
 * Maps backend error codes to user-friendly messages
 */
export const AUTH_ERROR_MAP: Record<string, string> = {
  // Authentication errors
  'INVALID_CREDENTIALS': ERROR_MESSAGES.INVALID_CREDENTIALS,
  'USER_NOT_FOUND': ERROR_MESSAGES.INVALID_CREDENTIALS,
  'INVALID_PASSWORD': ERROR_MESSAGES.INVALID_CREDENTIALS,
  'ACCOUNT_INACTIVE': ERROR_MESSAGES.ACCOUNT_INACTIVE,
  'ACCOUNT_DISABLED': ERROR_MESSAGES.ACCOUNT_INACTIVE,
  
  // Two-factor errors
  '2FA_REQUIRED': ERROR_MESSAGES.TWO_FACTOR_REQUIRED,
  'INVALID_2FA_CODE': ERROR_MESSAGES.INVALID_TWO_FACTOR,
  'INVALID_2FA_TOKEN': ERROR_MESSAGES.INVALID_TWO_FACTOR,
  '2FA_CODE_EXPIRED': ERROR_MESSAGES.INVALID_TWO_FACTOR,
  
  // Token errors
  'TOKEN_EXPIRED': ERROR_MESSAGES.TOKEN_EXPIRED,
  'INVALID_TOKEN': ERROR_MESSAGES.TOKEN_EXPIRED,
  'TOKEN_MALFORMED': ERROR_MESSAGES.TOKEN_EXPIRED,
  
  // Authorization errors
  'UNAUTHORIZED': ERROR_MESSAGES.UNAUTHORIZED,
  'INSUFFICIENT_PERMISSIONS': ERROR_MESSAGES.UNAUTHORIZED,
  'ACCESS_DENIED': ERROR_MESSAGES.UNAUTHORIZED,
  
  // Network/Server errors
  'NETWORK_ERROR': ERROR_MESSAGES.NETWORK_ERROR,
  'SERVER_ERROR': ERROR_MESSAGES.SERVER_ERROR,
  'INTERNAL_SERVER_ERROR': ERROR_MESSAGES.SERVER_ERROR,
  'SERVICE_UNAVAILABLE': ERROR_MESSAGES.SERVER_ERROR,
  
  // Validation errors
  'VALIDATION_ERROR': 'Please check your input and try again',
  'REQUIRED_FIELD': ERROR_MESSAGES.REQUIRED_FIELD,
  'INVALID_FORMAT': 'Invalid input format',
  
  // Project/City errors
  'PROJECT_NOT_FOUND': 'Selected project not found',
  'CITY_NOT_FOUND': 'Selected city not found',
  'PROJECT_INACTIVE': 'Selected project is inactive',
  'CITY_INACTIVE': 'Selected city is inactive',
  
  // Rate limiting
  'RATE_LIMIT_EXCEEDED': 'Too many attempts. Please try again later.',
  'TOO_MANY_REQUESTS': 'Too many requests. Please slow down.',
};

/**
 * HTTP status code to error message mapping
 */
export const HTTP_ERROR_MAP: Record<number, string> = {
  400: 'Bad request. Please check your input.',
  401: ERROR_MESSAGES.UNAUTHORIZED,
  403: ERROR_MESSAGES.UNAUTHORIZED,
  404: 'Resource not found.',
  409: 'Conflict. The requested action cannot be completed.',
  422: 'Invalid input. Please check your data.',
  429: 'Too many requests. Please try again later.',
  500: ERROR_MESSAGES.SERVER_ERROR,
  502: 'Service temporarily unavailable.',
  503: 'Service temporarily unavailable.',
  504: 'Request timeout. Please try again.',
};

/**
 * Extracts error message from API response
 */
export const extractErrorMessage = (error: unknown): string => {
  // Handle string errors
  if (typeof error === 'string') {
    return AUTH_ERROR_MAP[error] || error;
  }

  // Handle Error objects
  if (error instanceof Error) {
    return AUTH_ERROR_MAP[error.message] || error.message;
  }

  // Handle API error responses
  if (isApiError(error)) {
    // Check if it's a structured API error
    if (error.error) {
      return AUTH_ERROR_MAP[error.error] || error.error;
    }

    // Check for field-specific validation errors
    if (error.details && error.details.length > 0) {
      return error.details[0].message;
    }
  }

  // Handle HTTP errors with status codes
  if (isHttpError(error)) {
    const message = HTTP_ERROR_MAP[error.status];
    if (message) {
      return message;
    }
  }

  // Handle axios errors
  if (isAxiosError(error)) {
    if (error.response?.status) {
      return HTTP_ERROR_MAP[error.response.status] || ERROR_MESSAGES.SERVER_ERROR;
    }
    if (error.code === 'NETWORK_ERROR' || error.message.includes('Network')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    return error.message || ERROR_MESSAGES.SERVER_ERROR;
  }

  // Handle fetch errors
  if (isFetchError(error)) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  // Fallback
  return ERROR_MESSAGES.SERVER_ERROR;
};

/**
 * Type guard for API error responses
 */
export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    error.success === false &&
    'error' in error
  );
};

/**
 * Type guard for HTTP errors
 */
export const isHttpError = (error: unknown): error is { status: number; message?: string } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as any).status === 'number'
  );
};

/**
 * Type guard for Axios errors
 */
export const isAxiosError = (error: unknown): error is {
  response?: { status: number; data?: any };
  code?: string;
  message: string;
} => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    ('response' in error || 'code' in error)
  );
};

/**
 * Type guard for Fetch API errors
 */
export const isFetchError = (error: unknown): error is TypeError => {
  return (
    error instanceof TypeError &&
    (error.message.includes('fetch') || error.message.includes('NetworkError'))
  );
};

/**
 * Creates a standardized error object
 */
export const createAuthError = (
  message: string,
  details?: Array<{ field: string; message: string }>
): ApiError => {
  return {
    success: false,
    error: message,
    details,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
  };
};

/**
 * Logs error for debugging (only in development)
 */
export const logError = (error: unknown, context?: string): void => {
  if (import.meta.env.DEV) {
    console.error(`[Auth Error${context ? ` - ${context}` : ''}]:`, error);
  }
};

/**
 * Handles token expiration errors
 */
export const isTokenExpiredError = (error: unknown): boolean => {
  const message = extractErrorMessage(error).toLowerCase();
  return (
    message.includes('token expired') ||
    message.includes('jwt expired') ||
    message.includes('token invalid') ||
    message.includes('unauthorized')
  );
};

/**
 * Handles network connectivity errors
 */
export const isNetworkError = (error: unknown): boolean => {
  const message = extractErrorMessage(error).toLowerCase();
  return (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('fetch') ||
    isFetchError(error) ||
    (isAxiosError(error) && (error.code === 'NETWORK_ERROR' || !error.response))
  );
};