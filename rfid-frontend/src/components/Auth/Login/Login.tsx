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
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext';
import type { LoginCredentials } from '../../../contexts/auth-context';
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
  // Hooks for old login functionality
  const { login } = useAuth();
  const { cities, selection, setSelection } = useTenant();

  // Form state - merged from old login
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    project: storage.getLastProject() || selection.project || '',
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

  // Cities fallback from old login
  const [citiesFallback, setCitiesFallback] = useState<Array<{ id: string; name: string }>>([]);

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
      // Use tenant cities if available, otherwise use auth service
      if (cities && cities.length > 0) {
        // For now, show all available cities (can be filtered later if needed)
        setFilteredCities(cities.map(city => ({
          id: city.id,
          name: city.name,
          country: city.country || '',
          isActive: city.isActive,
        })));
      } else {
        // Fallback to auth service
        const projectCities = await authService.getCitiesForProject(projectId);
        setFilteredCities(projectCities);
      }
      
      // Announce to screen readers when cities are loaded
      announceToScreenReader(
        `Cities loaded for ${projectId}`, 
        'polite'
      );
    } catch (error) {
      console.warn('Failed to load cities for project:', error);
      // Try fallback from citiesFallback if available
      if (citiesFallback.length > 0) {
        setFilteredCities(citiesFallback.map(city => ({
          id: city.id,
          name: city.name,
          country: '',
          isActive: true,
        })));
      } else {
        setFilteredCities([]);
      }
      announceToScreenReader('Failed to load cities for selected project', 'assertive');
    } finally {
      setIsLoadingCities(false);
    }
  }, [cities, citiesFallback]);

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
   * Load cities fallback from tenant context
   */
  useEffect(() => {
    if (cities && cities.length > 0) {
      setCitiesFallback(cities.map(city => ({
        id: city.id,
        name: city.name
      })));
    }
  }, [cities]);

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
      // Prepare credentials using the old format
      const credentials: LoginCredentials = {
        username: formData.username.trim(),
        password: formData.password,
        projectId: formData.project.trim(),
        cityName: formData.city.trim(),
      };

      // Use the old login method from useAuth hook
      await login(credentials);

      // Save remember me preference and other storage items
      storage.setRememberMe(formData.rememberMe);
      if (formData.project) {
        storage.setLastProject(formData.project);
      }
      if (formData.city) {
        storage.setLastCity(formData.city);
      }

      // Update tenant selection if needed
      if (setSelection) {
        // Find the city ID from filteredCities
        const cityId = filteredCities.find(city => city.name === formData.city)?.id;
        setSelection({
          ...selection,
          project: formData.project,
          cityId: cityId
        });
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
  }, [formData, login, selection, setSelection, filteredCities]);

  /**
   * Clear error messages
   */
  const clearError = useCallback(() => {
    setError(null);
    setValidationErrors({});
  }, []);

  return (
    <div className={`modern-login-container ${className}`}>
      {/* Animated Technology Background */}
      <div className="tech-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="circuit-pattern"></div>
        <div className="floating-elements">
          <div className="floating-lock"></div>
          <div className="floating-chip"></div>
          <div className="floating-wave"></div>
          <div className="floating-rfid-card"></div>
          <div className="floating-rfid-reader"></div>
          <div className="floating-fingerprint"></div>
          <div className="floating-shield"></div>
          <div className="floating-key"></div>
          <div className="floating-access-point"></div>
        </div>
      </div>

      {/* Main Login Container */}
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-md w-full">
          {/* Glassmorphism Login Card */}
          <div className="glass-card">
            {/* Header with RFID Icon */}
            <div className="text-center mb-8">
              <div className="rfid-icon-container">
                <svg className="rfid-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="8" y="16" width="48" height="32" rx="4" stroke="currentColor" strokeWidth="2" fill="rgba(59, 130, 246, 0.1)"/>
                  <rect x="12" y="20" width="8" height="6" rx="1" fill="currentColor"/>
                  <path d="M24 26c0-4 3-7 7-7s7 3 7 7" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M26 30c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <circle cx="31" cy="32" r="2" fill="currentColor"/>
                  <path d="M40 22h12M40 26h8M40 30h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h1 className="main-title">
                RFID Access Control
              </h1>
              <p className="subtitle">
                Secure • Innovative • Professional
              </p>
            </div>

            {/* Login Form */}
            <div className="form-container">
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
            </div>

            {/* Footer */}
            <div className="footer-section">
              <div className="security-badges">
                <div className="security-badge">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span>Encrypted</span>
                </div>
                <div className="security-badge">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                  </svg>
                  <span>Secure</span>
                </div>
                <div className="security-badge">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Verified</span>
                </div>
              </div>
              <div className="copyright">
                <p>Perfect IT Solutions © 2025</p>
                <p>Asset Access Control System v2.1</p>
              </div>
            </div>
          </div>

          {/* Floating Action Hint */}
          <div className="floating-hint">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Multi-tenant secure authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;