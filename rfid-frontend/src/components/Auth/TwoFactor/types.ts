/**
 * Two-Factor Authentication Component Types
 */

export interface TwoFactorComponentProps {
  twoFactorToken: string;
  onSuccess: (user: any, tokens: { accessToken: string; refreshToken: string }) => void;
  onBackToLogin: () => void;
  className?: string;
}

export interface TwoFactorFormState {
  code: string;
  useBackupCode: boolean;
}

export interface TwoFactorComponentState {
  formData: TwoFactorFormState;
  isLoading: boolean;
  error: string | null;
  validationErrors: Record<string, string>;
  remainingAttempts: number;
  showBackupCodeInput: boolean;
  backupCode: string;
}

export interface TwoFactorCodeInputProps {
  value: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  onBlur?: () => void;
}

export interface TwoFactorBackupCodeInputProps {
  value: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}