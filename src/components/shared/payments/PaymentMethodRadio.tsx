'use client';

import React from 'react';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentMethodRadioProps {
  id: string;
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
  description?: string;
}

export function PaymentMethodRadio({
  id,
  name,
  value,
  label,
  checked,
  onChange,
  disabled = false,
  description,
}: PaymentMethodRadioProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
        checked
          ? 'border-emerald-500 bg-emerald-500/10'
          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={() => !disabled && onChange(value)}
        disabled={disabled}
        className="sr-only"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <CreditCard className={cn(
            'h-4 w-4 flex-shrink-0',
            checked ? 'text-emerald-400' : 'text-zinc-400'
          )} />
          <span className={cn(
            'text-sm font-medium',
            checked ? 'text-emerald-200' : 'text-zinc-300'
          )}>
            {label}
          </span>
          {checked && (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
          )}
        </div>
        {description && (
          <p className="text-xs text-zinc-400 mt-1 ml-6">
            {description}
          </p>
        )}
      </div>
    </label>
  );
}

