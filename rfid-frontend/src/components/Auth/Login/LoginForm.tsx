/**
 * Login Form Component
 * Contains the form fields and handles form submission
 */

import React from 'react';
import { LoginField, LoginSelectField, LoginButton } from './LoginFields';

import type { LoginFormData, LoginValidationErrors, City } from '../../../types/auth';

interface LoginFormProps {
  formData: LoginFormData;
  isLoading: boolean;
  error: string | null;
  validationErrors: LoginValidationErrors;
  filteredCities: City[];
  isLoadingCities: boolean;
  onFieldChange: (field: keyof LoginFormData, value: string | boolean) => void;
  onProjectChange: (projectName: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClearError: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  formData,
  isLoading,
  error,
  validationErrors,
  filteredCities,
  isLoadingCities,
  onFieldChange,
  onProjectChange,
  onSubmit,
  onClearError,
}) => {
  // Prepare city options
  const cityOptions = filteredCities.map(city => ({
    value: city.name,
    label: `${city.name}, ${city.country}`,
  }));

  return (
    <form 
      className="mt-8 space-y-6" 
      onSubmit={onSubmit}
      noValidate
      aria-labelledby="login-heading"
    >
      {/* Screen reader heading */}
      <h2 id="login-heading" className="sr-only">
        Login Form
      </h2>

      {/* Global Error Message */}
      {error && (
        <div 
          role="alert"
          className="rounded-md bg-red-50 p-4 border border-red-200"
          aria-live="polite"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg 
                className="h-5 w-5 text-red-400" 
                viewBox="0 0 20 20" 
                fill="currentColor"
                aria-hidden="true"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-red-800">
                {error}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                type="button"
                className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                onClick={onClearError}
                aria-label="Dismiss error"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        
        {/* Project Field */}
        <LoginField
          id="project"
          name="project"
          type="text"
          value={formData.project}
          label="Project Name"
          placeholder="Enter project name"
          error={validationErrors.project}
          required
          disabled={isLoading}
          onChange={(value: string) => onProjectChange(value)}
        />

        {/* City Field */}
        <LoginSelectField
          id="city"
          name="city"
          value={formData.city}
          label="City"
          placeholder={
            isLoadingCities 
              ? "Loading cities..." 
              : !formData.project 
                ? "Select a project first" 
                : filteredCities.length === 0 
                  ? "No cities available" 
                  : "Select a city"
          }
          error={validationErrors.city}
          required
          disabled={isLoading || isLoadingCities || !formData.project || filteredCities.length === 0}
          options={cityOptions}
          onChange={(value: string) => onFieldChange('city', value)}
        />

        {/* Username Field */}
        <LoginField
          id="username"
          name="username"
          type="text"
          value={formData.username}
          label="Username"
          placeholder="Enter your username"
          error={validationErrors.username}
          required
          disabled={isLoading}
          autoComplete="username"
          onChange={(value: string) => onFieldChange('username', value)}
        />

        {/* Password Field */}
        <LoginField
          id="password"
          name="password"
          type="password"
          value={formData.password}
          label="Password"
          placeholder="Enter your password"
          error={validationErrors.password}
          required
          disabled={isLoading}
          autoComplete="current-password"
          onChange={(value: string) => onFieldChange('password', value)}
        />

      </div>

      {/* Remember Me Checkbox */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={formData.rememberMe}
            onChange={(e) => onFieldChange('rememberMe', e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            aria-describedby="remember-me-description"
          />
          <label 
            htmlFor="remember-me" 
            className="ml-2 block text-sm text-gray-700 cursor-pointer"
          >
            Remember me
          </label>
          <span 
            id="remember-me-description" 
            className="sr-only"
          >
            Keep me signed in on this device
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <div>
        <LoginButton
          type="submit"
          disabled={isLoading}
          loading={isLoading}
          className="group relative w-full"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </LoginButton>
      </div>

      {/* Additional Info */}
      <div className="text-center text-sm text-gray-600">
        <p>
          Need help? Contact your system administrator.
        </p>
      </div>
    </form>
  );
};

export default LoginForm;