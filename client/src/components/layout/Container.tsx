import React from 'react';
import { cn } from '../../utils/cn';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  center?: boolean;
  children: React.ReactNode;
}

const containerSizes = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
};

const containerPadding = {
  none: '',
  sm: 'px-4 py-6',
  md: 'px-6 py-8',
  lg: 'px-8 py-12',
};

export const Container: React.FC<ContainerProps> = ({
  size = 'lg',
  padding = 'md',
  center = true,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'w-full',
        containerSizes[size],
        containerPadding[padding],
        center && 'mx-auto',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};