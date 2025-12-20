import React from 'react';
import { cn } from '@/lib/utils';
import { ZEN_COLORS } from '../tokens/colors';
import { ZEN_SPACING } from '../tokens/spacing';

export interface ZenBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const badgeVariants = {
  default: 'bg-zinc-800 text-zinc-200 border-zinc-700',
  secondary: 'bg-zinc-700 text-zinc-300 border-zinc-600',
  destructive: 'bg-red-900/20 text-red-400 border-red-800/30',
  outline: 'border-zinc-600 text-zinc-300 bg-transparent',
  success: 'bg-green-900/20 text-green-400 border-green-800/30',
  warning: 'bg-yellow-900/20 text-yellow-400 border-yellow-800/30',
  info: 'bg-blue-900/30 text-blue-400 border-blue-700/50'
};

const badgeSizes = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
};

export function ZenBadge({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: ZenBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border font-medium',
        badgeVariants[variant],
        badgeSizes[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
