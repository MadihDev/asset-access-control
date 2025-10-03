import React, { useState, useCallback, useEffect } from 'react';
import { authService } from '../../../services/auth';
import { validateTwoFactorForm } from '../../../utils/auth/validation';
import type { TwoFactorFormData, TwoFactorValidationErrors } from '../../../types/auth';
import type { TwoFactorComponentProps } from './types';

interface ComponentState {
  formData: TwoFactorFormData & { useBackupCode: boolean };
  isLoading: boolean;
  error: string | null;
  validationErrors: TwoFactorValidationErrors & { backupCode?: string };
  remainingAttempts: number;
  showBackupCodeInput: boolean;
  backupCode: string;
}

/**
 * Two-Factor Authentication Component
 * Handles SMS code verification during login flow
 */
const TwoFactorAuth: React.FC<TwoFactorComponentProps> = ({
  twoFactorToken,
  onSuccess,
  onBackToLogin,
  className = ''
}) => {
  const [state, setState] = useState<ComponentState>({
    formData: {
      code: '',
      useBackupCode: false
    },
    isLoading: false,
    error: null,
    validationErrors: {},
    remainingAttempts: 3,
    showBackupCodeInput: false,
    backupCode: ''
  });

  // Reset form when twoFactorToken changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      formData: { code: '', useBackupCode: false },
      error: null,
      validationErrors: {},
      backupCode: ''
    }));
  }, [twoFactorToken]);

  const handleInputChange = useCallback((field: keyof TwoFactorFormData, value: string) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, [field]: value },
      error: null,
      validationErrors: { ...prev.validationErrors, [field]: '' }
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateTwoFactorForm(state.formData);
    if (Object.keys(validationErrors).length > 0) {
      setState(prev => ({ ...prev, validationErrors }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await authService.verifyTwoFactor({
        twoFactorToken,
        code: state.formData.code
      });

      // LoginResponse has user, accessToken, refreshToken directly
      if (result.success) {
        onSuccess(result.user, {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        });
      } else {
        throw new Error(result.message || 'Two-factor verification failed');
      }
    } catch (error: unknown) {
      const remainingAttempts = state.remainingAttempts - 1;
      const errorMessage = error instanceof Error ? error.message : 'Verification failed. Please try again.';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        remainingAttempts,
        formData: { ...prev.formData, code: '' }
      }));

      // Show backup code option after 2 failed attempts
      if (remainingAttempts <= 1) {
        setState(prev => ({ ...prev, showBackupCodeInput: true }));
      }
    }
  }, [state.formData, state.remainingAttempts, twoFactorToken, onSuccess]);

  const handleBackupCodeSubmit = useCallback(async () => {
    if (!state.backupCode.trim()) {
      setState(prev => ({
        ...prev,
        validationErrors: { backupCode: 'Backup code is required' }
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await authService.verifyTwoFactor({
        twoFactorToken,
        code: state.backupCode
      });

      // LoginResponse has user, accessToken, refreshToken directly
      if (result.success) {
        onSuccess(result.user, {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        });
      } else {
        throw new Error(result.message || 'Backup code verification failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid backup code. Please try again.';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        backupCode: ''
      }));
    }
  }, [state.backupCode, twoFactorToken, onSuccess]);

  const toggleBackupCode = useCallback(() => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, useBackupCode: !prev.formData.useBackupCode },
      error: null,
      validationErrors: {}
    }));
  }, []);

  return (
    <div className={`two-factor-auth ${className}`}>
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Two-Factor Authentication
          </h2>
          <p className="text-gray-600">
            We've sent a verification code to your registered phone number.
            Please enter the code below to continue.
          </p>
        </div>

        {state.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{state.error}</p>
            {state.remainingAttempts > 0 && (
              <p className="text-red-600 text-xs mt-1">
                {state.remainingAttempts} attempt{state.remainingAttempts !== 1 ? 's' : ''} remaining
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!state.formData.useBackupCode ? (
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={state.formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.replace(/\D/g, ''))}
                className={`w-full px-3 py-2 border rounded-md text-center text-lg tracking-widest ${
                  state.validationErrors.code
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50`}
                placeholder="000000"
                disabled={state.isLoading}
                autoFocus
                autoComplete="one-time-code"
              />
              {state.validationErrors.code && (
                <p className="mt-1 text-sm text-red-600">{state.validationErrors.code}</p>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="backupCode" className="block text-sm font-medium text-gray-700 mb-1">
                Backup Code
              </label>
              <input
                id="backupCode"
                type="text"
                value={state.backupCode}
                onChange={(e) => setState(prev => ({ ...prev, backupCode: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md ${
                  state.validationErrors.backupCode
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50`}
                placeholder="Enter backup code"
                disabled={state.isLoading}
                autoFocus
              />
              {state.validationErrors.backupCode && (
                <p className="mt-1 text-sm text-red-600">{state.validationErrors.backupCode}</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={state.isLoading}
              onClick={state.formData.useBackupCode ? handleBackupCodeSubmit : undefined}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {state.isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {state.showBackupCodeInput && (
            <button
              type="button"
              onClick={toggleBackupCode}
              className="w-full text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
            >
              {state.formData.useBackupCode ? 'Use SMS code instead' : 'Use backup code instead'}
            </button>
          )}

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus:underline"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuth;