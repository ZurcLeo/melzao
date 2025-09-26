import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'glass' | 'solid';
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  variant = 'glass',
  fullWidth = true,
  type = 'text',
  className,
  disabled,
  ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const baseClasses = cn(
    'transition-all duration-200 rounded-xl border text-white placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    leftIcon ? 'pl-10' : 'pl-4',
    (rightIcon || isPassword) ? 'pr-10' : 'pr-4',
    'py-3',
    fullWidth && 'w-full'
  );

  const variantClasses = {
    glass: 'bg-white/10 backdrop-blur-md border-white/20 focus:bg-white/15',
    solid: 'bg-gray-800/90 border-gray-600 focus:bg-gray-800',
  };

  return (
    <div className={cn('space-y-2', fullWidth && 'w-full')}>
      {label && (
        <label className="block text-sm font-medium text-white">
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}

        <input
          className={cn(
            baseClasses,
            variantClasses[variant],
            error && 'border-error-500 focus:border-error-500 focus:ring-error-500/50',
            'focus:scale-105 transform transition-transform',
            className
          )}
          type={inputType}
          disabled={disabled}
          {...props}
        />

        {(rightIcon || isPassword) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isPassword ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={disabled}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            ) : (
              rightIcon
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-error-400 flex items-center gap-1 animate-slide-down">
          <span className="text-error-500">⚠</span>
          {error}
        </p>
      )}

      {helperText && !error && (
        <p className="text-sm text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
};