'use client';

import React from 'react';
import { ReminderCard } from './ReminderCard';
import type { ReminderWithPromise } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { cn } from '@/lib/utils';

interface ReminderSideSheetSectionProps {
  title: string;
  variant: 'destructive' | 'warning' | 'default';
  reminders: ReminderWithPromise[];
  studioSlug: string;
  completingIds: Set<string>;
  onView: (promiseId: string) => void;
  onComplete: (reminderId: string) => void;
  onWhatsApp?: (reminder: ReminderWithPromise) => void;
}

export function ReminderSideSheetSection({
  title,
  variant,
  reminders,
  studioSlug,
  completingIds,
  onView,
  onComplete,
}: ReminderSideSheetSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-200">
            {title}
          </h3>
          <span className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded",
            variant === 'destructive' && "text-red-400 bg-red-500/10",
            variant === 'warning' && "text-amber-400 bg-amber-500/10",
            variant === 'default' && "text-blue-400 bg-blue-500/10"
          )}>
            {reminders.length}
          </span>
        </div>
      </div>
      {reminders.length === 0 ? (
        <p className="text-xs text-zinc-500 px-1">Sin recordatorios</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder, index) => (
            <div
              key={reminder.id}
              className="animate-in fade-in slide-in-from-left-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ReminderCard
                reminder={reminder}
                studioSlug={studioSlug}
                onView={onView}
                onComplete={onComplete}
                isCompleting={completingIds.has(reminder.id)}
                variant="compact"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
