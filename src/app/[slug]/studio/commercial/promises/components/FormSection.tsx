'use client';

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/shadcn/collapsible';
import { cn } from '@/lib/utils';

export type FormSectionId = 'base' | 'negociacion' | 'condiciones';

interface FormSectionProps {
  id: FormSectionId;
  title: string;
  summary?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  headerRef?: React.RefObject<HTMLDivElement | null>;
  headerAction?: React.ReactNode;
  contentClassName?: string;
}

export function FormSection({
  id,
  title,
  summary,
  open,
  onOpenChange,
  children,
  headerRef,
  headerAction,
  contentClassName,
}: FormSectionProps) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="mb-4"
    >
      <div
        ref={headerRef}
        className={cn(
          'flex w-full items-center gap-2 border border-zinc-700/50 bg-zinc-800/20',
          open ? 'rounded-t-lg border-b border-zinc-700/50' : 'rounded-lg'
        )}
      >
        <CollapsibleTrigger
          className={cn(
            'flex flex-1 items-start gap-2 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-400 hover:bg-zinc-800/30 transition-colors min-w-0',
            !open && summary != null && 'flex-col gap-0.5'
          )}
        >
          <div className="flex items-center gap-2 min-w-0 w-full">
            {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            <span>{title}</span>
          </div>
          {!open && summary != null && (
            <span className="text-sm text-emerald-400 normal-case font-medium pl-5 truncate w-full block leading-tight">
              {summary}
            </span>
          )}
        </CollapsibleTrigger>
        {headerAction}
      </div>
      <CollapsibleContent>
        <div
          className={cn(
            'rounded-b-lg border border-t-0 border-zinc-700/50 overflow-hidden transition-all duration-200 ease-out',
            contentClassName ?? 'bg-zinc-900/50 p-3'
          )}
        >
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
