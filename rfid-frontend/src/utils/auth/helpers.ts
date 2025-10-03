/**
 * Authentication Helper Utilities
 */

import { AUTH_STORAGE_KEYS, TOKEN_CONFIG, USER_ROLES, ROLE_HIERARCHY } from './constants';
import type { User, UserRole } from '../../types/auth';

/**
 * Local Storage Helpers
 */
export const storage = {
  /**
   * Get access token from localStorage
   */
  getAccessToken: (): string | null => {
    return localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  },

  /**
   * Set access token in localStorage
   */
  setAccessToken: (token: string): void => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, token);
  },

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken: (): string | null => {
    return localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  },

  /**
   * Set refresh token in localStorage
   */
  setRefreshToken: (token: string): void => {
    localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  /**
   * Get user data from localStorage
   */
  getUserData: (): User | null => {
    const userData = localStorage.getItem(AUTH_STORAGE_KEYS.USER_DATA);
    if (!userData) return null;
    
    try {
      return JSON.parse(userData) as User;
    } catch {
      return null;
    }
  },

  /**
   * Set user data in localStorage
   */
  setUserData: (user: User): void => {
    localStorage.setItem(AUTH_STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  },

  /**
   * Get remember me preference
   */
  getRememberMe: (): boolean => {
    return localStorage.getItem(AUTH_STORAGE_KEYS.REMEMBER_ME) === 'true';
  },

  /**
   * Set remember me preference
   */
  setRememberMe: (remember: boolean): void => {
    localStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER_ME, remember.toString());
  },

  /**
   * Get last selected project
   */
  getLastProject: (): string | null => {
    return localStorage.getItem(AUTH_STORAGE_KEYS.LAST_PROJECT);
  },

  /**
   * Set last selected project
   */
  setLastProject: (project: string): void => {
    localStorage.setItem(AUTH_STORAGE_KEYS.LAST_PROJECT, project);
  },

  /**
   * Get last selected city
   */
  getLastCity: (): string | null => {
    return localStorage.getItem(AUTH_STORAGE_KEYS.LAST_CITY);
  },

  /**
   * Set last selected city
   */
  setLastCity: (city: string): void => {
    localStorage.setItem(AUTH_STORAGE_KEYS.LAST_CITY, city);
  },

  /**
   * Clear all authentication data
   */
  clearAll: (): void => {
    Object.values(AUTH_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },

  /**
   * Clear tokens only (keep user preferences)
   */
  clearTokens: (): void => {
    localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER_DATA);
  },
};

/**
 * JWT Token Helpers
 */
export const tokenHelpers = {
  /**
   * Decode JWT token payload
   */
  decodeToken: (token: string): any | null => {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  },

  /**
   * Check if token is expired
   */
  isTokenExpired: (token: string): boolean => {
    const payload = tokenHelpers.decodeToken(token);
    if (!payload || !payload.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  },

  /**
   * Check if token needs refresh (expires within threshold)
   */
  needsRefresh: (token: string): boolean => {
    const payload = tokenHelpers.decodeToken(token);
    if (!payload || !payload.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const expiryTime = payload.exp;
    const threshold = TOKEN_CONFIG.REFRESH_THRESHOLD / 1000; // Convert to seconds
    
    return (expiryTime - currentTime) < threshold;
  },

  /**
   * Get token expiry date
   */
  getTokenExpiry: (token: string): Date | null => {
    const payload = tokenHelpers.decodeToken(token);
    if (!payload || !payload.exp) return null;
    
    return new Date(payload.exp * 1000);
  },

  /**
   * Validate token format
   */
  isValidTokenFormat: (token: string): boolean => {
    const parts = token.split('.');
    return parts.length === 3;
  },
};

/**
 * Role and Permission Helpers
 */
export const roleHelpers = {
  /**
   * Check if user has required role or higher
   */
  hasRole: (userRole: UserRole, requiredRole: UserRole): boolean => {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    return userLevel >= requiredLevel;
  },

  /**
   * Check if user is admin or higher
   */
  isAdmin: (user: User | null): boolean => {
    if (!user) return false;
    return roleHelpers.hasRole(user.role, USER_ROLES.ADMIN);
  },

  /**
   * Check if user is supervisor or higher
   */
  isSupervisor: (user: User | null): boolean => {
    if (!user) return false;
    return roleHelpers.hasRole(user.role, USER_ROLES.SUPERVISOR);
  },

  /**
   * Check if user is super admin
   */
  isSuperAdmin: (user: User | null): boolean => {
    if (!user) return false;
    return user.role === USER_ROLES.SUPER_ADMIN;
  },

  /**
   * Get role display name
   */
  getRoleDisplayName: (role: UserRole): string => {
    switch (role) {
      case USER_ROLES.SUPER_ADMIN:
        return 'Super Admin';
      case USER_ROLES.ADMIN:
        return 'Admin';
      case USER_ROLES.SUPERVISOR:
        return 'Supervisor';
      case USER_ROLES.USER:
        return 'User';
      default:
        return 'Unknown';
    }
  },
};

/**
 * Authentication State Helpers
 */
export const authHelpers = {
  /**
   * Check if user is authenticated based on stored data
   */
  isAuthenticated: (): boolean => {
    const token = storage.getAccessToken();
    const user = storage.getUserData();
    
    if (!token || !user) return false;
    
    // Check if token is valid format
    if (!tokenHelpers.isValidTokenFormat(token)) return false;
    
    // Check if token is not expired
    if (tokenHelpers.isTokenExpired(token)) return false;
    
    return true;
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser: (): User | null => {
    if (!authHelpers.isAuthenticated()) return null;
    return storage.getUserData();
  },

  /**
   * Format user display name
   */
  getUserDisplayName: (user: User): string => {
    return `${user.firstName} ${user.lastName}`.trim() || user.username;
  },

  /**
   * Get user initials for avatar
   */
  getUserInitials: (user: User): string => {
    const firstName = user.firstName?.charAt(0)?.toUpperCase() || '';
    const lastName = user.lastName?.charAt(0)?.toUpperCase() || '';
    
    if (firstName && lastName) {
      return firstName + lastName;
    }
    
    if (firstName) {
      return firstName;
    }
    
    return user.username?.charAt(0)?.toUpperCase() || '?';
  },

  /**
   * Check if authentication needs refresh
   */
  needsTokenRefresh: (): boolean => {
    const token = storage.getAccessToken();
    if (!token) return false;
    
    return tokenHelpers.needsRefresh(token);
  },

  /**
   * Create authorization header for API requests
   */
  getAuthHeader: (): Record<string, string> | null => {
    const token = storage.getAccessToken();
    if (!token) return null;
    
    return {
      'Authorization': `Bearer ${token}`,
    };
  },
};

/**
 * Utility Functions
 */
export const utils = {
  /**
   * Generate a random string for CSRF protection
   */
  generateRandomString: (length: number = 32): string => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return result;
  },

  /**
   * Debounce function for input validation
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  /**
   * Sleep function for testing or delays
   */
  sleep: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Check if running in development mode
   */
  isDevelopment: (): boolean => {
    return import.meta.env.DEV;
  },

  /**
   * Format date for display
   */
  formatDate: (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  },
};