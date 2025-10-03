/**
 * Two-Factor Authentication Service
 * Handles 2FA verification, setup, and management
 */

import { AUTH_ENDPOINTS } from '../../utils/auth/constants';
import { extractErrorMessage, logError } from '../../utils/auth/errorHandling';
import { storage } from '../../utils/auth/helpers';

import type {
  TwoFactorCredentials,
  TwoFactorResponse,
  TwoFactorSetupResponse,
  ApiResponse,
} from '../../types/auth';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Two-Factor Authentication Service Class
 */
class TwoFactorService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * HTTP request helper
   */
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

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logError(error, `2FA HTTP Request to ${endpoint}`);
      throw error;
    }
  }

  /**
   * Verify two-factor authentication code
   */
  async verifyTwoFactor(credentials: TwoFactorCredentials): Promise<TwoFactorResponse> {
    try {
      const response = await this.request<TwoFactorResponse>(
        AUTH_ENDPOINTS.TWO_FACTOR_VERIFY,
        {
          method: 'POST',
          body: JSON.stringify(credentials),
        }
      );

      if (response.success && response.data) {
        const twoFactorData = response.data;
        
        // Store tokens and user data after successful 2FA
        storage.setAccessToken(twoFactorData.accessToken);
        storage.setRefreshToken(twoFactorData.refreshToken);
        storage.setUserData(twoFactorData.user);

        return twoFactorData;
      }

      throw new Error(response.error || '2FA verification failed');
    } catch (error) {
      logError(error, '2FA Verification');
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * Set up two-factor authentication for a user
   */
  async setupTwoFactor(): Promise<TwoFactorSetupResponse> {
    try {
      // This would require authentication, so we need to include auth header
      const token = storage.getAccessToken();
      if (!token) {
        throw new Error('Authentication required to set up 2FA');
      }

      const response = await this.request<TwoFactorSetupResponse>(
        AUTH_ENDPOINTS.TWO_FACTOR_SETUP,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || '2FA setup failed');
    } catch (error) {
      logError(error, '2FA Setup');
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * Confirm two-factor setup with verification code
   */
  async confirmTwoFactorSetup(code: string): Promise<boolean> {
    try {
      const token = storage.getAccessToken();
      if (!token) {
        throw new Error('Authentication required to confirm 2FA setup');
      }

      const response = await this.request<{ success: boolean }>(
        `${AUTH_ENDPOINTS.TWO_FACTOR_SETUP}/confirm`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ code }),
        }
      );

      return response.success;
    } catch (error) {
      logError(error, '2FA Setup Confirmation');
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(password: string): Promise<boolean> {
    try {
      const token = storage.getAccessToken();
      if (!token) {
        throw new Error('Authentication required to disable 2FA');
      }

      const response = await this.request<{ success: boolean }>(
        `${AUTH_ENDPOINTS.TWO_FACTOR_SETUP}/disable`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ password }),
        }
      );

      return response.success;
    } catch (error) {
      logError(error, '2FA Disable');
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * Generate backup codes for 2FA
   */
  async generateBackupCodes(): Promise<string[]> {
    try {
      const token = storage.getAccessToken();
      if (!token) {
        throw new Error('Authentication required to generate backup codes');
      }

      const response = await this.request<{ codes: string[] }>(
        `${AUTH_ENDPOINTS.TWO_FACTOR_SETUP}/backup-codes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.success && response.data) {
        return response.data.codes;
      }

      return [];
    } catch (error) {
      logError(error, '2FA Backup Codes Generation');
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(backupCode: string, twoFactorToken: string): Promise<TwoFactorResponse> {
    try {
      const response = await this.request<TwoFactorResponse>(
        `${AUTH_ENDPOINTS.TWO_FACTOR_VERIFY}/backup`,
        {
          method: 'POST',
          body: JSON.stringify({
            backupCode,
            twoFactorToken,
          }),
        }
      );

      if (response.success && response.data) {
        const twoFactorData = response.data;
        
        // Store tokens and user data after successful backup code verification
        storage.setAccessToken(twoFactorData.accessToken);
        storage.setRefreshToken(twoFactorData.refreshToken);
        storage.setUserData(twoFactorData.user);

        return twoFactorData;
      }

      throw new Error(response.error || 'Backup code verification failed');
    } catch (error) {
      logError(error, 'Backup Code Verification');
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * Check if user has 2FA enabled
   */
  async getTwoFactorStatus(): Promise<{ enabled: boolean; backupCodesCount: number }> {
    try {
      const token = storage.getAccessToken();
      if (!token) {
        throw new Error('Authentication required to check 2FA status');
      }

      const response = await this.request<{ enabled: boolean; backupCodesCount: number }>(
        `${AUTH_ENDPOINTS.TWO_FACTOR_SETUP}/status`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.success && response.data) {
        return response.data;
      }

      return { enabled: false, backupCodesCount: 0 };
    } catch (error) {
      logError(error, '2FA Status Check');
      return { enabled: false, backupCodesCount: 0 };
    }
  }

  /**
   * Validate 2FA code format
   */
  validateCodeFormat(code: string): boolean {
    // Remove any whitespace
    const cleanCode = code.replace(/\s/g, '');
    
    // Check if it's exactly 6 digits
    return /^\d{6}$/.test(cleanCode);
  }

  /**
   * Format 2FA code for display (add space in middle)
   */
  formatCodeForDisplay(code: string): string {
    const cleanCode = code.replace(/\s/g, '');
    if (cleanCode.length === 6) {
      return `${cleanCode.slice(0, 3)} ${cleanCode.slice(3)}`;
    }
    return cleanCode;
  }

  /**
   * Clean 2FA code (remove spaces and non-digits)
   */
  cleanCode(code: string): string {
    return code.replace(/[^\d]/g, '');
  }
}

// Export singleton instance
export const twoFactorService = new TwoFactorService();