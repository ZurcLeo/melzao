import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
}

const buttonVariants = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-glow hover:shadow-glow-lg',
  secondary: 'bg-secondary-600 hover:bg-secondary-700 text-white shadow-soft',
  success: 'bg-success-600 hover:bg-success-700 text-white shadow-soft',
  error: 'bg-error-600 hover:bg-error-700 text-white shadow-soft',
  warning: 'bg-warning-600 hover:bg-warning-700 text-white shadow-soft',
  ghost: 'glass-button text-white hover:bg-white/20',
  outline: 'border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-base rounded-xl',
  lg: 'px-6 py-3 text-lg rounded-xl',
  xl: 'px-8 py-4 text-xl rounded-2xl',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:scale-105 active:scale-95 transform',
        buttonVariants[variant],
        buttonSizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      )}

      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2">{icon}</span>
      )}

      {children}

      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </button>
  );
};