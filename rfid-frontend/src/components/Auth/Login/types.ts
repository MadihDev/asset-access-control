/**
 * Login Component Types
 */

export interface LoginComponentProps {
  className?: string;
}

export interface LoginFormState {
  username: string;
  password: string;
  project: string;
  city: string;
  rememberMe: boolean;
}

export interface LoginComponentState {
  formData: LoginFormState;
  isLoading: boolean;
  error: string | null;
  validationErrors: Record<string, string>;
  availableProjects: Array<{ id: string; name: string; slug: string }>;
  availableCities: Array<{ id: string; name: string; country: string }>;
  showPassword: boolean;
}

export interface LoginFormFieldProps {
  id: string;
  name: string;
  type: string;
  value: string;
  label: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export interface LoginSelectFieldProps {
  id: string;
  name: string;
  value: string;
  label: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export interface LoginButtonProps {
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}