/**
 * Authentication Validation Utilities
 */

import { VALIDATION_RULES, ERROR_MESSAGES } from './constants';
import type { LoginFormData, LoginValidationErrors, TwoFactorFormData, TwoFactorValidationErrors } from '../../types/auth';

/**
 * Validates a username field
 */
export const validateUsername = (username: string): string | null => {
  if (!username || username.trim().length === 0) {
    return ERROR_MESSAGES.REQUIRED_FIELD;
  }

  const trimmed = username.trim();
  
  if (trimmed.length < VALIDATION_RULES.USERNAME.MIN_LENGTH) {
    return ERROR_MESSAGES.INVALID_USERNAME;
  }

  if (trimmed.length > VALIDATION_RULES.USERNAME.MAX_LENGTH) {
    return ERROR_MESSAGES.INVALID_USERNAME;
  }

  if (!VALIDATION_RULES.USERNAME.PATTERN.test(trimmed)) {
    return ERROR_MESSAGES.INVALID_USERNAME;
  }

  return null;
};

/**
 * Validates a password field
 */
export const validatePassword = (password: string): string | null => {
  if (!password || password.length === 0) {
    return ERROR_MESSAGES.REQUIRED_FIELD;
  }

  if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    return ERROR_MESSAGES.INVALID_PASSWORD;
  }

  if (password.length > VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
    return ERROR_MESSAGES.INVALID_PASSWORD;
  }

  if (VALIDATION_RULES.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    return ERROR_MESSAGES.INVALID_PASSWORD;
  }

  if (VALIDATION_RULES.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    return ERROR_MESSAGES.INVALID_PASSWORD;
  }

  if (VALIDATION_RULES.PASSWORD.REQUIRE_NUMBER && !/\d/.test(password)) {
    return ERROR_MESSAGES.INVALID_PASSWORD;
  }

  if (VALIDATION_RULES.PASSWORD.REQUIRE_SPECIAL) {
    const specialChars = VALIDATION_RULES.PASSWORD.SPECIAL_CHARS;
    const hasSpecial = specialChars.split('').some(char => password.includes(char));
    if (!hasSpecial) {
      return ERROR_MESSAGES.INVALID_PASSWORD;
    }
  }

  return null;
};

/**
 * Validates a two-factor authentication code
 */
export const validateTwoFactorCode = (code: string): string | null => {
  if (!code || code.trim().length === 0) {
    return ERROR_MESSAGES.REQUIRED_FIELD;
  }

  const trimmed = code.trim();

  if (!VALIDATION_RULES.TWO_FACTOR_CODE.PATTERN.test(trimmed)) {
    return ERROR_MESSAGES.INVALID_TWO_FACTOR_CODE;
  }

  return null;
};

/**
 * Validates a project selection
 */
export const validateProject = (project: string): string | null => {
  if (!project || project.trim().length === 0) {
    return ERROR_MESSAGES.REQUIRED_FIELD;
  }
  return null;
};

/**
 * Validates a city selection
 */
export const validateCity = (city: string): string | null => {
  if (!city || city.trim().length === 0) {
    return ERROR_MESSAGES.REQUIRED_FIELD;
  }
  return null;
};

/**
 * Validates the entire login form
 */
export const validateLoginForm = (formData: LoginFormData): LoginValidationErrors => {
  const errors: LoginValidationErrors = {};

  const usernameError = validateUsername(formData.username);
  if (usernameError) {
    errors.username = usernameError;
  }

  const passwordError = validatePassword(formData.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  const projectError = validateProject(formData.project);
  if (projectError) {
    errors.project = projectError;
  }

  const cityError = validateCity(formData.city);
  if (cityError) {
    errors.city = cityError;
  }

  return errors;
};

/**
 * Validates the two-factor authentication form
 */
export const validateTwoFactorForm = (formData: TwoFactorFormData): TwoFactorValidationErrors => {
  const errors: TwoFactorValidationErrors = {};

  const codeError = validateTwoFactorCode(formData.code);
  if (codeError) {
    errors.code = codeError;
  }

  return errors;
};

/**
 * Checks if validation errors object has any errors
 */
export const hasValidationErrors = (errors: LoginValidationErrors | TwoFactorValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};

/**
 * Sanitizes input by trimming whitespace
 */
export const sanitizeInput = (input: string): string => {
  return input.trim();
};

/**
 * Checks if a string is a valid email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};