/**
 * API Response Types for Authentication
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
  timestamp?: string;
  path?: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
  timestamp: string;
  path: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export type RefreshTokenResponse = ApiResponse<TokenResponse>;

export type LogoutResponse = ApiResponse<null>;

export interface HealthCheckData {
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number;
  };
}

export type HealthCheckResponse = ApiResponse<HealthCheckData>;