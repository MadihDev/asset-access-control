/**
 * Authentication Service
 * Handles login, logout, token refresh, and authentication state management
 */

import { AUTH_ENDPOINTS } from '../../utils/auth/constants';
import { extractErrorMessage, logError } from '../../utils/auth/errorHandling';
import { storage, tokenHelpers } from '../../utils/auth/helpers';

import type {
  LoginCredentials,
  LoginResponse,
  ApiResponse,
  TokenResponse,
  User,
  Project,
  City,
} from '../../types/auth';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * HTTP Client with automatic token handling
 */
class HttpClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth header if token exists
    const token = storage.getAccessToken();
    if (token && !tokenHelpers.isTokenExpired(token)) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logError(error, `HTTP Request to ${endpoint}`);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

/**
 * Authentication Service Class
 */
class AuthService {
  private http: HttpClient;

  constructor() {
    this.http = new HttpClient(API_BASE_URL);
  }

  /**
   * Login user with credentials
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await this.http.post<LoginResponse>(
        AUTH_ENDPOINTS.LOGIN,
        credentials
      );

      if (response.success && response.data) {
        const loginData = response.data;
        
        // Store tokens and user data
        if (!loginData.requires2FA) {
          storage.setAccessToken(loginData.accessToken);
          storage.setRefreshToken(loginData.refreshToken);
          storage.setUserData(loginData.user);
        }

        // Store project/city preferences
        storage.setLastProject(credentials.projectId);
        storage.setLastCity(credentials.cityName);

        return loginData;
      }

      throw new Error(response.error || 'Login failed');
    } catch (error) {
      logError(error, 'Login');
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Try to notify server about logout
      const token = storage.getAccessToken();
      if (token && !tokenHelpers.isTokenExpired(token)) {
        await this.http.post(AUTH_ENDPOINTS.LOGOUT);
      }
    } catch (error) {
      // Logout locally even if server request fails
      logError(error, 'Logout');
    } finally {
      // Always clear local storage
      storage.clearAll();
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<TokenResponse> {
    try {
      const refreshToken = storage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      if (tokenHelpers.isTokenExpired(refreshToken)) {
        throw new Error('Refresh token expired');
      }

      const response = await this.http.post<TokenResponse>(
        AUTH_ENDPOINTS.REFRESH,
        { refreshToken }
      );

      if (response.success && response.data) {
        const tokens = response.data;
        
        // Update stored tokens
        storage.setAccessToken(tokens.accessToken);
        storage.setRefreshToken(tokens.refreshToken);

        return tokens;
      }

      throw new Error(response.error || 'Token refresh failed');
    } catch (error) {
      logError(error, 'Token Refresh');
      
      // Clear tokens if refresh fails
      storage.clearTokens();
      
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * Get current user from storage
   */
  getCurrentUser(): User | null {
    return storage.getUserData();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = storage.getAccessToken();
    const user = storage.getUserData();

    if (!token || !user) {
      return false;
    }

    // Check token validity
    if (tokenHelpers.isTokenExpired(token)) {
      // Try to refresh if refresh token exists
      const refreshToken = storage.getRefreshToken();
      if (refreshToken && !tokenHelpers.isTokenExpired(refreshToken)) {
        // Token refresh should be handled by the calling component
        return true;
      }
      
      // Both tokens expired
      storage.clearTokens();
      return false;
    }

    return true;
  }

  /**
   * Check if token needs refresh
   */
  needsTokenRefresh(): boolean {
    const token = storage.getAccessToken();
    if (!token) {
      return false;
    }

    return tokenHelpers.needsRefresh(token);
  }

  /**
   * Get available projects for login form
   */
  async getProjects(): Promise<Project[]> {
    try {
      const response = await this.http.get<Project[]>(AUTH_ENDPOINTS.PUBLIC_PROJECTS);
      
      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      logError(error, 'Get Projects');
      return [];
    }
  }

  /**
   * Get available cities
   */
  async getCities(): Promise<City[]> {
    try {
      const response = await this.http.get<City[]>(AUTH_ENDPOINTS.PUBLIC_CITIES);
      
      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      logError(error, 'Get Cities');
      return [];
    }
  }

  /**
   * Get cities available for a specific project
   */
  async getCitiesForProject(projectId: string): Promise<City[]> {
    try {
      const response = await this.http.get<City[]>(`${AUTH_ENDPOINTS.PUBLIC_CITIES_FOR_PROJECT}/${encodeURIComponent(projectId)}/cities`);
      
      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      logError(error, 'Get Cities for Project');
      return [];
    }
  }

  /**
   * Validate project-city combination
   */
  async validateProjectCityCombo(projectId: string, cityName: string): Promise<boolean> {
    try {
      const response = await this.http.get<{isValid: boolean}>(`${AUTH_ENDPOINTS.PUBLIC_VALIDATE_COMBO}?projectId=${encodeURIComponent(projectId)}&cityName=${encodeURIComponent(cityName)}`);
      
      if (response.success && response.data) {
        return response.data.isValid;
      }

      return false;
    } catch (error) {
      logError(error, 'Validate Project-City Combo');
      return false;
    }
  }

  /**
   * Verify two-factor authentication code
   */
  async verifyTwoFactor(request: { twoFactorToken: string; code: string }): Promise<LoginResponse> {
    try {
      const response = await this.http.post<LoginResponse>(
        AUTH_ENDPOINTS.TWO_FACTOR_VERIFY,
        { 
          code: request.code,
          twoFactorToken: request.twoFactorToken
        }
      );

      if (response.success && response.data) {
        const loginData = response.data;
        
        // Store tokens and user data after successful 2FA
        storage.setAccessToken(loginData.accessToken);
        storage.setRefreshToken(loginData.refreshToken);
        storage.setUserData(loginData.user);

        return loginData;
      }

      throw new Error(response.error || '2FA verification failed');
    } catch (error) {
      logError(error, '2FA Verification');
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * Check server health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.http.get(AUTH_ENDPOINTS.HEALTH);
      return response.success;
    } catch (error) {
      logError(error, 'Health Check');
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();