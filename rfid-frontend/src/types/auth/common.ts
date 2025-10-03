/**
 * Common Authentication Types
 */

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  projectCityId: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  twoFactorEnabled?: boolean;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'USER';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  requires2FA: boolean;
  twoFactorToken?: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface City {
  id: string;
  name: string;
  country: string;
  isActive: boolean;
}

export interface ProjectCity {
  id: string;
  project: Project;
  city: City;
}