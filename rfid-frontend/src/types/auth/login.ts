/**
 * Login-specific Types
 */

import type { User, Project, City } from './common';

export interface LoginCredentials {
  username: string;
  password: string;
  projectId: string;
  cityName: string;
}

export interface LoginFormData {
  username: string;
  password: string;
  project: string;
  city: string;
  rememberMe: boolean;
}

export interface LoginValidationErrors {
  username?: string;
  password?: string;
  project?: string;
  city?: string;
  general?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
  requires2FA?: boolean;
  twoFactorToken?: string;
}

export interface ProjectCityOption {
  projectId: string;
  projectName: string;
  projectSlug: string;
  cityId: string;
  cityName: string;
  cityCountry: string;
  isActive: boolean;
}

export interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  availableProjects: Project[];
  availableCities: City[];
  validationErrors: LoginValidationErrors;
  onClearError: () => void;
}

export interface LoginContainerProps {
  onLoginSuccess: (user: User, tokens: { accessToken: string; refreshToken: string }) => void;
  onRequire2FA: (twoFactorToken: string) => void;
}