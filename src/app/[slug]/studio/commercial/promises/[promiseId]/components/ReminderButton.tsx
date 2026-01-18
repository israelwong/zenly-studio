'use client';

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { ZenButton, ZenBadge } from '@/components/ui/zen';
import { 
  getReminderByPromise,
  type Reminder 
} from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { ReminderFormModal } from '@/components/shared/reminders';

interface ReminderButtonProps {
  studioSlug: string;
  promiseId: string;
}

export function ReminderButton({ studioSlug, promiseId }: ReminderButtonProps) {
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadReminder();
  }, [studioSlug, promiseId]);

  const loadReminder = async () => {
    setLoading(true);
    try {
      const result = await getReminderByPromise(studioSlug, promiseId);
      if (result.success) {
        setReminder(result.data);
      }
    } catch (error) {
      console.error('Error cargando seguimiento:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getDateStatus = (reminderDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(reminderDate);
    date.setHours(0, 0, 0, 0);
    
    if (date < today) {
      return { text: 'Vencido', variant: 'destructive' as const };
    }
    if (date.getTime() === today.getTime()) {
      return { text: 'Hoy', variant: 'warning' as const };
    }
    return { text: formatDate(reminderDate), variant: 'default' as const };
  };

  if (loading) {
    return (
      <ZenButton
        variant="ghost"
        size="sm"
        disabled
        className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
      >
        <Clock className="h-3.5 w-3.5 animate-pulse" />
        <span>Cargando...</span>
      </ZenButton>
    );
  }

  const hasReminder = reminder && !reminder.is_completed;
  const dateStatus = hasReminder ? getDateStatus(reminder.reminder_date) : null;

  return (
    <>
      <ZenButton
        variant="ghost"
        size="sm"
        onClick={() => setModalOpen(true)}
        className={`gap-1.5 px-2.5 py-1.5 h-7 text-xs ${
          hasReminder ? 'hover:bg-blue-500/10 hover:text-blue-400' : ''
        }`}
      >
        {hasReminder ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Seguimiento</span>
            {dateStatus && (
              <ZenBadge variant={dateStatus.variant} size="sm" className="ml-1">
                {dateStatus.text}
              </ZenBadge>
            )}
          </>
        ) : (
          <>
            <Clock className="h-3.5 w-3.5" />
            <span>Agendar seguimiento</span>
          </>
        )}
      </ZenButton>

      <ReminderFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        studioSlug={studioSlug}
        promiseId={promiseId}
        existingReminder={reminder}
        onSuccess={() => {
          loadReminder();
          setModalOpen(false);
        }}
      />
    </>
  );
}
