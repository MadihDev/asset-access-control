/**
 * Token Service
 * Handles JWT token operations, storage, and automatic refresh
 */

import { storage, tokenHelpers } from '../../utils/auth/helpers';
import { logError, extractErrorMessage } from '../../utils/auth/errorHandling';
import { TOKEN_CONFIG } from '../../utils/auth/constants';

import type { TokenResponse, User } from '../../types/auth';

/**
 * Token Management Service
 */
class TokenService {
  private refreshPromise: Promise<TokenResponse> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  /**
   * Set authentication tokens and user data
   */
  setTokens(accessToken: string, refreshToken: string, user?: User): void {
    storage.setAccessToken(accessToken);
    storage.setRefreshToken(refreshToken);
    
    if (user) {
      storage.setUserData(user);
    }

    // Schedule automatic refresh
    this.scheduleTokenRefresh();
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return storage.getAccessToken();
  }

  /**
   * Get current refresh token
   */
  getRefreshToken(): string | null {
    return storage.getRefreshToken();
  }

  /**
   * Clear all tokens and user data
   */
  clearTokens(): void {
    storage.clearTokens();
    this.clearRefreshTimer();
  }

  /**
   * Check if access token is valid and not expired
   */
  isAccessTokenValid(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return false;
    }

    // Check format
    if (!tokenHelpers.isValidTokenFormat(token)) {
      return false;
    }

    // Check expiration
    if (tokenHelpers.isTokenExpired(token)) {
      return false;
    }

    return true;
  }

  /**
   * Check if refresh token is valid and not expired
   */
  isRefreshTokenValid(): boolean {
    const token = this.getRefreshToken();
    if (!token) {
      return false;
    }

    // Check format
    if (!tokenHelpers.isValidTokenFormat(token)) {
      return false;
    }

    // Check expiration
    if (tokenHelpers.isTokenExpired(token)) {
      return false;
    }

    return true;
  }

  /**
   * Check if tokens need refresh (access token expires soon)
   */
  needsRefresh(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return false;
    }

    return tokenHelpers.needsRefresh(token);
  }

  /**
   * Refresh access token using refresh token
   * Prevents multiple simultaneous refresh requests
   */
  async refreshAccessToken(): Promise<TokenResponse> {
    // Return existing promise if refresh is already in progress
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Create new refresh promise
    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      // Clear promise when done
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<TokenResponse> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    if (!this.isRefreshTokenValid()) {
      throw new Error('Refresh token is invalid or expired');
    }

    try {
      // Import authService here to avoid circular dependency
      const { authService } = await import('./authService');
      
      const tokens = await authService.refreshToken();
      
      // Update tokens in storage
      this.setTokens(tokens.accessToken, tokens.refreshToken);
      
      return tokens;
    } catch (error) {
      logError(error, 'Token Refresh');
      
      // Clear invalid tokens
      this.clearTokens();
      
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * Get Authorization header for API requests
   */
  getAuthorizationHeader(): Record<string, string> | null {
    const token = this.getAccessToken();
    
    if (!token || !this.isAccessTokenValid()) {
      return null;
    }

    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Decode token payload
   */
  decodeToken(token?: string): any | null {
    const tokenToUse = token || this.getAccessToken();
    if (!tokenToUse) {
      return null;
    }

    return tokenHelpers.decodeToken(tokenToUse);
  }

  /**
   * Get token expiration date
   */
  getTokenExpiry(token?: string): Date | null {
    const tokenToUse = token || this.getAccessToken();
    if (!tokenToUse) {
      return null;
    }

    return tokenHelpers.getTokenExpiry(tokenToUse);
  }

  /**
   * Get time until token expires (in milliseconds)
   */
  getTimeUntilExpiry(token?: string): number {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) {
      return 0;
    }

    return Math.max(0, expiry.getTime() - Date.now());
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(): void {
    this.clearRefreshTimer();

    const timeUntilExpiry = this.getTimeUntilExpiry();
    if (timeUntilExpiry === 0) {
      return;
    }

    // Schedule refresh when token is close to expiring
    const refreshTime = Math.max(
      1000, // Minimum 1 second
      timeUntilExpiry - TOKEN_CONFIG.REFRESH_THRESHOLD
    );

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        logError(error, 'Automatic Token Refresh');
        // Clear tokens if automatic refresh fails
        this.clearTokens();
      }
    }, refreshTime);
  }

  /**
   * Clear refresh timer
   */
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Initialize token service (call on app startup)
   */
  initialize(): void {
    // Schedule refresh if we have valid tokens
    if (this.isAccessTokenValid()) {
      this.scheduleTokenRefresh();
    } else {
      // Clear invalid tokens
      this.clearTokens();
    }
  }

  /**
   * Cleanup (call on app shutdown)
   */
  cleanup(): void {
    this.clearRefreshTimer();
    this.refreshPromise = null;
  }

  /**
   * Check if user is authenticated (has valid tokens)
   */
  isAuthenticated(): boolean {
    // Check if we have both tokens
    const hasTokens = this.getAccessToken() && this.getRefreshToken();
    if (!hasTokens) {
      return false;
    }

    // If access token is valid, we're authenticated
    if (this.isAccessTokenValid()) {
      return true;
    }

    // If access token is invalid but refresh token is valid,
    // we can still consider user authenticated (token will be refreshed)
    if (this.isRefreshTokenValid()) {
      return true;
    }

    return false;
  }

  /**
   * Force token refresh (for testing or manual refresh)
   */
  async forceRefresh(): Promise<TokenResponse> {
    // Clear existing promise to force new refresh
    this.refreshPromise = null;
    return this.refreshAccessToken();
  }
}

// Export singleton instance
export const tokenService = new TokenService();