import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white';
  className?: string;
}

const spinnerSizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const spinnerColors = {
  primary: 'text-primary-500',
  secondary: 'text-secondary-500',
  white: 'text-white',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className,
}) => {
  return (
    <motion.div
      className={cn('inline-block', className)}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <div
        className={cn(
          'border-2 border-current border-t-transparent rounded-full',
          spinnerSizes[size],
          spinnerColors[variant]
        )}
      />
    </motion.div>
  );
};

interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Carregando...',
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 bg-black/50 backdrop-blur-sm z-50',
        'flex items-center justify-center',
        className
      )}
    >
      <div className="glass-card p-6 text-center">
        <LoadingSpinner size="lg" variant="white" className="mx-auto mb-4" />
        <p className="text-white font-medium">{message}</p>
      </div>
    </motion.div>
  );
};