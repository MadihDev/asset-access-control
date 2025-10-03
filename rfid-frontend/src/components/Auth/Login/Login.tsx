/**
 * Main Login Component
 * Handles user authentication with project, city, username, and password
 * Enhanced with multi-tenant project dropdown and cascading city selection
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LoginForm } from './LoginForm';
import { authService } from '../../../services/auth';
import { validateLoginForm } from '../../../utils/auth/validation';
import { extractErrorMessage } from '../../../utils/auth/errorHandling';
import { storage } from '../../../utils/auth/helpers';
import './Login.css';

// Simple accessibility announcement helper
const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
};

import type { LoginFormData, LoginValidationErrors, City } from '../../../types/auth';
import type { LoginComponentProps } from './types';

export const Login: React.FC<LoginComponentProps> = ({ className = '' }) => {
  // Form state
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    project: storage.getLastProject() || '',
    city: storage.getLastCity() || '',
    rememberMe: storage.getRememberMe(),
  });

  // Component state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<LoginValidationErrors>({});
  
  // Multi-tenant data state
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  /**
   * Filter cities based on selected project
   */
  const filterCitiesByProject = useCallback(async (projectId: string) => {
    if (!projectId) {
      setFilteredCities([]);
      return;
    }

    setIsLoadingCities(true);
    try {
      // Get cities available for the specific project
      const cities = await authService.getCitiesForProject(projectId);
      setFilteredCities(cities);
      
      // Announce to screen readers when cities are loaded
      announceToScreenReader(
        `${cities.length} cities available for ${projectId}`, 
        'polite'
      );
    } catch (error) {
      console.warn('Failed to load cities for project:', error);
      setFilteredCities([]);
      announceToScreenReader('Failed to load cities for selected project', 'assertive');
    } finally {
      setIsLoadingCities(false);
    }
  }, [setIsLoadingCities, setFilteredCities]);

  /**
   * Load cities when project changes
   */
  useEffect(() => {
    // If project is provided, load its cities
    if (formData.project.trim()) {
      filterCitiesByProject(formData.project.trim());
    } else {
      // Clear cities if no project
      setFilteredCities([]);
    }
  }, [formData.project, filterCitiesByProject]);

  /**
   * Handle project change and filter cities
   */
  const handleProjectChange = useCallback((projectName: string) => {
    setFormData(prev => ({
      ...prev,
      project: projectName,
      city: '', // Reset city when project changes
    }));

    // Clear project-related validation errors
    setValidationErrors(prev => ({
      ...prev,
      project: undefined,
      city: undefined,
    }));

    filterCitiesByProject(projectName);
  }, [filterCitiesByProject]);

  /**
   * Handle form field changes
   */
  const handleFieldChange = useCallback((field: keyof LoginFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear field-specific validation error
    if (validationErrors[field as keyof LoginValidationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }

    // Clear general error when user starts typing
    if (error) {
      setError(null);
    }
  }, [validationErrors, error]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setError(null);
    setValidationErrors({});

    // Validate form
    const errors = validateLoginForm(formData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      
      // Announce validation errors to screen readers
      const firstError = Object.values(errors)[0];
      if (firstError) {
        announceToScreenReader(`Form validation error: ${firstError}`, 'assertive');
      }
      
      return;
    }

    setIsLoading(true);

    try {
      // Prepare credentials for API
      const credentials = {
        username: formData.username.trim(),
        password: formData.password,
        projectId: formData.project.trim(),
        cityName: formData.city.trim(),
      };

      // Attempt login
      const response = await authService.login(credentials);

      // Save remember me preference
      storage.setRememberMe(formData.rememberMe);

      // Handle successful login
      if (response.requires2FA) {
        // Redirect to 2FA component would be handled by parent component
        // For now, we'll emit a custom event
        window.dispatchEvent(new CustomEvent('auth:require2fa', {
          detail: { twoFactorToken: response.twoFactorToken }
        }));
      } else {
        // Complete login
        window.dispatchEvent(new CustomEvent('auth:login-success', {
          detail: { user: response.user, tokens: { accessToken: response.accessToken, refreshToken: response.refreshToken } }
        }));
      }

      // Announce success to screen readers
      announceToScreenReader('Login successful', 'polite');

    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      setError(errorMessage);
      
      // Announce error to screen readers
      announceToScreenReader(`Login failed: ${errorMessage}`, 'assertive');
    } finally {
      setIsLoading(false);
    }
  }, [formData]);

  /**
   * Clear error messages
   */
  const clearError = useCallback(() => {
    setError(null);
    setValidationErrors({});
  }, []);

  return (
    <div className={`login-container ${className}`}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Sign in to your account
            </h1>
            <p className="text-sm text-gray-600">
              Access the Asset Control System
            </p>
          </div>

          {/* Login Form */}
          <LoginForm
            formData={formData}
            isLoading={isLoading}
            error={error}
            validationErrors={validationErrors}
            filteredCities={filteredCities}
            isLoadingCities={isLoadingCities}
            onFieldChange={handleFieldChange}
            onProjectChange={handleProjectChange}
            onSubmit={handleSubmit}
            onClearError={clearError}
          />

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
            <p>Asset Access Control System v2.1</p>
            <p>© 2025 Perfect IT Solutions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;