/**
 * Login Form Component
 * Contains the form fields and handles form submission
 * Updated with modern glassmorphism design
 */

import React from 'react';

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
          className="form-field error-message"
          aria-live="polite"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            backdropFilter: 'blur(10px)',
            color: 'rgba(255, 255, 255, 0.95)'
          }}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg 
                className="h-5 w-5" 
                style={{ color: 'rgba(239, 68, 68, 0.8)' }}
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
              <p style={{ fontSize: '0.875rem', margin: 0 }}>
                {error}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                type="button"
                onClick={onClearError}
                aria-label="Dismiss error"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '0.375rem',
                  color: 'rgba(239, 68, 68, 0.8)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
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
      <div>
        
        {/* Project Field */}
        <div className="form-field">
          <input
            id="project"
            name="project"
            type="text"
            value={formData.project}
            placeholder="Enter project name"
            required
            disabled={isLoading}
            aria-invalid={validationErrors.project ? 'true' : 'false'}
            aria-describedby={validationErrors.project ? 'project-error' : undefined}
            onChange={(e) => onProjectChange(e.target.value)}
          />
          {validationErrors.project && (
            <div id="project-error" className="error-text" style={{ color: 'rgba(239, 68, 68, 0.8)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {validationErrors.project}
            </div>
          )}
        </div>

        {/* City Field */}
        <div className="form-field">
          <select
            id="city"
            name="city"
            value={formData.city}
            required
            disabled={isLoading || isLoadingCities || !formData.project || filteredCities.length === 0}
            aria-invalid={validationErrors.city ? 'true' : 'false'}
            aria-describedby={validationErrors.city ? 'city-error' : undefined}
            onChange={(e) => onFieldChange('city', e.target.value)}
          >
            <option value="" disabled>
              {isLoadingCities 
                ? "Loading cities..." 
                : !formData.project 
                  ? "Select a project first" 
                  : filteredCities.length === 0 
                    ? "No cities available" 
                    : "Select a city"}
            </option>
            {cityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {validationErrors.city && (
            <div id="city-error" className="error-text" style={{ color: 'rgba(239, 68, 68, 0.8)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {validationErrors.city}
            </div>
          )}
        </div>

        {/* Username Field */}
        <div className="form-field">
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            placeholder="Enter your username"
            required
            disabled={isLoading}
            autoComplete="username"
            aria-invalid={validationErrors.username ? 'true' : 'false'}
            aria-describedby={validationErrors.username ? 'username-error' : undefined}
            onChange={(e) => onFieldChange('username', e.target.value)}
          />
          {validationErrors.username && (
            <div id="username-error" className="error-text" style={{ color: 'rgba(239, 68, 68, 0.8)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {validationErrors.username}
            </div>
          )}
        </div>

        {/* Password Field */}
        <div className="form-field">
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            placeholder="Enter your password"
            required
            disabled={isLoading}
            autoComplete="current-password"
            aria-invalid={validationErrors.password ? 'true' : 'false'}
            aria-describedby={validationErrors.password ? 'password-error' : undefined}
            onChange={(e) => onFieldChange('password', e.target.value)}
          />
          {validationErrors.password && (
            <div id="password-error" className="error-text" style={{ color: 'rgba(239, 68, 68, 0.8)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {validationErrors.password}
            </div>
          )}
        </div>

      </div>

      {/* Remember Me Checkbox */}
      <div className="form-field" style={{ marginBottom: '2rem' }}>
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={formData.rememberMe}
            onChange={(e) => onFieldChange('rememberMe', e.target.checked)}
            disabled={isLoading}
            style={{
              width: '1rem',
              height: '1rem',
              accentColor: '#3B82F6',
              marginRight: '0.75rem'
            }}
            aria-describedby="remember-me-description"
          />
          <label 
            htmlFor="remember-me" 
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              userSelect: 'none'
            }}
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
      <div className="form-field">
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: '600',
            letterSpacing: '0.025em',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            position: 'relative',
            overflow: 'hidden',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading && (
            <svg 
              className="animate-spin" 
              style={{ 
                width: '1.25rem', 
                height: '1.25rem', 
                marginRight: '0.5rem',
                display: 'inline-block'
              }} 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </form>
  );
};

export default LoginForm;