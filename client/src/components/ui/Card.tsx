import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'gradient' | 'rainbow';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverable?: boolean;
  children: React.ReactNode;
}

const cardVariants = {
  glass: 'glass-card',
  solid: 'bg-gray-800/90 border border-gray-700/50 rounded-2xl shadow-medium',
  gradient: 'bg-gradient-to-br from-primary-900/50 via-secondary-900/50 to-accent-900/50 border border-white/10 rounded-2xl shadow-medium backdrop-blur-md',
  rainbow: 'rainbow-border shadow-hard',
};

const cardPadding = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

export const Card: React.FC<CardProps> = ({
  variant = 'glass',
  padding = 'md',
  hoverable = false,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'transition-all duration-200',
        cardVariants[variant],
        cardPadding[padding],
        hoverable && 'cursor-pointer hover:-translate-y-1 hover:scale-105',
        className
      )}
      {...props}
    >
      {variant === 'rainbow' ? (
        <div className={cn('bg-gray-900/95 rounded-xl', cardPadding[padding])}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
};

// Componentes auxiliares para estrutura de Card
export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('flex flex-col space-y-1.5 pb-4', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3 className={cn('text-xl font-semibold leading-none tracking-tight text-white', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn('text-sm text-gray-300', className)} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('pt-0', className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('flex items-center pt-4', className)} {...props}>
    {children}
  </div>
);