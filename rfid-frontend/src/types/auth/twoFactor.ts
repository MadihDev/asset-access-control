/**
 * Two-Factor Authentication Types
 */

import type { User } from './common';

export interface TwoFactorCredentials {
  twoFactorToken: string;
  code: string;
}

export interface TwoFactorResponse {
  success: boolean;
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface TwoFactorFormData {
  code: string;
}

export interface TwoFactorValidationErrors {
  code?: string;
  general?: string;
}

export interface TwoFactorFormProps {
  onSubmit: (credentials: TwoFactorCredentials) => Promise<void>;
  onBackToLogin: () => void;
  isLoading: boolean;
  error: string | null;
  validationErrors: TwoFactorValidationErrors;
  onClearError: () => void;
  twoFactorToken: string;
}

export interface TwoFactorSetupData {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export interface TwoFactorSetupResponse {
  success: boolean;
  data: TwoFactorSetupData;
}