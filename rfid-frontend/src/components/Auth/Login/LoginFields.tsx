/**
 * Login Form Field Components
 * Reusable form components with accessibility and validation
 */

import React, { useState } from 'react';
import type { LoginFormFieldProps, LoginSelectFieldProps, LoginButtonProps } from './types';

/**
 * Text Input Field Component
 */
export const LoginField: React.FC<LoginFormFieldProps> = ({
  id,
  name,
  type,
  value,
  label,
  placeholder,
  error,
  required = false,
  disabled = false,
  autoComplete,
  onChange,
  onBlur,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="form-field">
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      <div className="relative">
        <input
          id={id}
          name={name}
          type={inputType}
          value={value}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          onChange={handleChange}
          onBlur={onBlur}
          className={`
            appearance-none relative block w-full px-3 py-2 border rounded-md 
            placeholder-gray-500 text-gray-900 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 
            disabled:opacity-50 disabled:cursor-not-allowed
            sm:text-sm
            ${error 
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300'
            }
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        
        {/* Password Toggle Button */}
        {type === 'password' && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={togglePasswordVisibility}
            disabled={disabled}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg 
                className="h-5 w-5 text-gray-400 hover:text-gray-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" 
                />
              </svg>
            ) : (
              <svg 
                className="h-5 w-5 text-gray-400 hover:text-gray-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p 
          id={`${id}-error`}
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * Select Field Component
 */
export const LoginSelectField: React.FC<LoginSelectFieldProps> = ({
  id,
  name,
  value,
  label,
  placeholder,
  error,
  required = false,
  disabled = false,
  options,
  onChange,
  onBlur,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="form-field">
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      <select
        id={id}
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        onChange={handleChange}
        onBlur={onBlur}
        className={`
          appearance-none relative block w-full px-3 py-2 border rounded-md 
          text-gray-900 bg-white
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 
          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
          sm:text-sm
          ${error 
            ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300'
          }
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="" disabled>
          {placeholder || `Select ${label.toLowerCase()}`}
        </option>
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {/* Error Message */}
      {error && (
        <p 
          id={`${id}-error`}
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * Button Component
 */
export const LoginButton: React.FC<LoginButtonProps> = ({
  type = 'button',
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  onClick,
}) => {
  const baseClasses = `
    inline-flex items-center justify-center border font-medium rounded-md 
    focus:outline-none focus:ring-2 focus:ring-offset-2 
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-colors duration-200
  `;

  const variantClasses = {
    primary: `
      border-transparent text-white bg-blue-600 
      hover:bg-blue-700 focus:ring-blue-500
      disabled:bg-blue-400
    `,
    secondary: `
      border-gray-300 text-gray-700 bg-white 
      hover:bg-gray-50 focus:ring-blue-500
      disabled:bg-gray-100
    `,
    outline: `
      border-blue-600 text-blue-600 bg-transparent 
      hover:bg-blue-50 focus:ring-blue-500
      disabled:border-gray-300 disabled:text-gray-400
    `,
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `.trim();

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      aria-disabled={disabled || loading}
    >
      {loading && (
        <svg 
          className="animate-spin -ml-1 mr-2 h-4 w-4" 
          fill="none" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};