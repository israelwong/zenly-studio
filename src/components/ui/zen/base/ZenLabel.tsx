import React from 'react';
import { cn } from '@/lib/utils';
import { ZEN_COLORS } from '../tokens/colors';
import { ZEN_SPACING } from '../tokens/spacing';

export interface ZenLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  variant?: 'default' | 'required' | 'optional';
  children: React.ReactNode;
}

const labelVariants = {
  default: 'text-zinc-300',
  required: 'text-zinc-300 after:content-["*"] after:text-red-400 after:ml-1',
  optional: 'text-zinc-400'
};

export function ZenLabel({
  variant = 'default',
  className,
  children,
  ...props
}: ZenLabelProps) {
  return (
    <label
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        labelVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}
