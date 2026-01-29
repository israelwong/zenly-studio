'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlarmClockCheck, Trash2, Loader2, Calendar, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ZenButton } from '@/components/ui/zen';
import {
  ZenDropdownMenu,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
  ZenDropdownMenuTrigger,
} from '@/components/ui/zen/overlays/ZenDropdownMenu';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { RemindersSideSheet } from './RemindersSideSheet';
import { deleteReminder, completeReminder } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { toast } from 'sonner';
import type { ReminderWithPromise } from '@/lib/actions/studio/commercial/promises/reminders.actions';

interface AlertsPopoverProps {
  studioSlug: string;
  initialAlerts?: ReminderWithPromise[]; // ✅ Pre-cargado en servidor (hoy + próximos, sin vencidos)
  initialCount?: number; // ✅ Pre-cargado en servidor
  onRemindersClick?: () => void; // Para abrir el sheet completo
}

export function AlertsPopover({ 
  studioSlug, 
  initialAlerts = [],
  initialCount = 0,
  onRemindersClick,
}: AlertsPopoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [alerts, setAlerts] = useState<ReminderWithPromise[]>(initialAlerts);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<ReminderWithPromise | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setAlerts(initialAlerts);
  }, [initialAlerts]);

  // Categorizar recordatorios: Hoy vs Próximos (comparar por día local para evitar desfase UTC)
  const categorizeReminders = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const today: ReminderWithPromise[] = [];
    const upcoming: ReminderWithPromise[] = [];

    alerts.forEach(r => {
      const d = new Date(r.reminder_date);
      const reminderDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const reminderTime = reminderDay.getTime();
      const todayTime = todayStart.getTime();
      if (reminderTime === todayTime) {
        today.push(r);
      } else if (reminderTime > todayTime) {
        upcoming.push(r);
      }
    });

    return { today, upcoming };
  };

  const { today: todayReminders, upcoming: upcomingReminders } = categorizeReminders();
  const totalCount = todayReminders.length + upcomingReminders.length; // Total global para el contador
  const MAX_UPCOMING_DISPLAY = 5; // Límite de próximos a mostrar
  const displayedUpcoming = upcomingReminders.slice(0, MAX_UPCOMING_DISPLAY);
  const hasMoreUpcoming = upcomingReminders.length > MAX_UPCOMING_DISPLAY;

  const handleReminderClick = (reminder: ReminderWithPromise) => {
    if (reminder.promise_id) {
      router.push(`/${studioSlug}/studio/commercial/promises/${reminder.promise_id}`);
    }
    setOpen(false);
  };

  const handleCompleteClick = async (reminder: ReminderWithPromise, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setCompletingId(reminder.id);
    
    // Actualización optimista
    setAlerts(prev => prev.filter(r => r.id !== reminder.id));
    
    try {
      const result = await completeReminder(studioSlug, reminder.id);

      if (result.success) {
        toast.success('Recordatorio completado');
        window.dispatchEvent(new CustomEvent('reminder-updated'));
      } else {
        // Revertir si falla
        setAlerts(initialAlerts);
        toast.error(result.error || 'Error al completar recordatorio');
      }
    } catch (error) {
      // Revertir si falla
      setAlerts(initialAlerts);
      console.error('Error completando recordatorio:', error);
      toast.error('Error al completar recordatorio');
    } finally {
      setCompletingId(null);
    }
  };

  const handleDeleteClick = (reminder: ReminderWithPromise, e: React.MouseEvent) => {
    e.stopPropagation();
    setReminderToDelete(reminder);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!reminderToDelete) return;

    setDeletingId(reminderToDelete.id);
    
    try {
      const result = await deleteReminder(studioSlug, reminderToDelete.id);

      if (result.success) {
        setAlerts(prev => prev.filter(r => r.id !== reminderToDelete.id));
        toast.success('Recordatorio eliminado');
        window.dispatchEvent(new CustomEvent('reminder-updated'));
        setShowDeleteModal(false);
        setReminderToDelete(null);
      } else {
        toast.error(result.error || 'Error al eliminar recordatorio');
      }
    } catch (error) {
      console.error('Error eliminando recordatorio:', error);
      toast.error('Error al eliminar recordatorio');
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewMore = () => {
    setOpen(false);
    if (onRemindersClick) {
      onRemindersClick();
    } else {
      setSheetOpen(true);
    }
  };

  // Renderizar solo después del mount para evitar problemas de hidratación
  if (!isMounted) {
    return (
      <ZenButton
        variant="ghost"
        size="icon"
        className="relative rounded-full text-zinc-400 hover:text-zinc-200"
        title="Recordatorios"
        disabled
      >
        <AlarmClockCheck className="h-5 w-5" />
        {initialCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {initialCount > 9 ? '9+' : initialCount}
          </span>
        )}
        <span className="sr-only">Recordatorios</span>
      </ZenButton>
    );
  }

  return (
    <>
      <ZenDropdownMenu open={open} onOpenChange={setOpen}>
        <ZenDropdownMenuTrigger asChild>
          <ZenButton
            variant="ghost"
            size="icon"
            className="relative rounded-full text-zinc-400 hover:text-zinc-200"
            title="Recordatorios"
          >
            <AlarmClockCheck className="h-5 w-5" />
            {totalCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {totalCount > 9 ? '9+' : totalCount}
              </span>
            )}
            <span className="sr-only">Recordatorios</span>
          </ZenButton>
        </ZenDropdownMenuTrigger>
        <ZenDropdownMenuContent
          align="end"
          className="w-80 max-h-[500px] flex flex-col p-0 overflow-x-hidden"
        >
          <div className="px-3 py-2 border-b border-zinc-700 flex-shrink-0">
            <h3 className="text-sm font-semibold text-zinc-200">Recordatorios</h3>
            {totalCount > 0 && (
              <p className="text-xs text-zinc-400 mt-1">
                {totalCount} {totalCount === 1 ? 'recordatorio pendiente' : 'recordatorios pendientes'}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 min-w-0">
            {/* Sección Hoy */}
            <div className="px-3 py-2.5 border-b border-zinc-800">
              <h4 className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                Hoy ({todayReminders.length})
              </h4>
            </div>
            {todayReminders.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-zinc-500">
                No hay recordatorios
              </div>
            ) : (
              <div className="py-1">
                {todayReminders.map((reminder) => (
                  <ReminderItem
                    key={reminder.id}
                    reminder={reminder}
                    open={open}
                    isToday={true}
                    onReminderClick={handleReminderClick}
                    onCompleteClick={handleCompleteClick}
                    onDeleteClick={handleDeleteClick}
                    isCompleting={completingId === reminder.id}
                  />
                ))}
              </div>
            )}

            {/* Sección Próximos */}
            {upcomingReminders.length > 0 && (
              <>
                <ZenDropdownMenuSeparator />
                <div className="px-3 py-2.5 border-b border-zinc-800">
                  <h4 className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                    Próximos ({upcomingReminders.length})
                  </h4>
                </div>
                <div className="py-1">
                  {displayedUpcoming.map((reminder) => (
                    <ReminderItem
                      key={reminder.id}
                      reminder={reminder}
                      open={open}
                      isToday={false}
                      onReminderClick={handleReminderClick}
                      onCompleteClick={handleCompleteClick}
                      onDeleteClick={handleDeleteClick}
                      isCompleting={completingId === reminder.id}
                    />
                  ))}
                </div>
                {hasMoreUpcoming && (
                  <div className="px-3 py-2 border-t border-zinc-800">
                    <button
                      onClick={handleViewMore}
                      className="text-xs text-zinc-400 hover:text-zinc-200 w-full text-left transition-colors font-medium"
                    >
                      Ver todos los próximos ({upcomingReminders.length - MAX_UPCOMING_DISPLAY} más)
                    </button>
                  </div>
                )}
              </>
            )}

            {todayReminders.length === 0 && upcomingReminders.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-zinc-400">
                No hay recordatorios
              </div>
            )}
          </div>

          {(!hasMoreUpcoming || (todayReminders.length === 0 && upcomingReminders.length <= MAX_UPCOMING_DISPLAY)) && (
            <div className="flex-shrink-0 border-t border-zinc-700">
              <div className="px-3 py-2">
                <button
                  onClick={handleViewMore}
                  className="text-xs text-zinc-400 hover:text-zinc-200 w-full text-left transition-colors"
                >
                  Ver más recordatorios
                </button>
              </div>
            </div>
          )}
        </ZenDropdownMenuContent>
      </ZenDropdownMenu>
      {!onRemindersClick && (
        <RemindersSideSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          studioSlug={studioSlug}
        />
      )}
      <ZenConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!deletingId) {
            setShowDeleteModal(false);
            setReminderToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar recordatorio"
        description="¿Estás seguro de que deseas eliminar este recordatorio? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={!!deletingId}
        loadingText="Eliminando..."
      />
    </>
  );
}

// Componente separado para cada recordatorio
function ReminderItem({
  reminder,
  open,
  isToday,
  onReminderClick,
  onCompleteClick,
  onDeleteClick,
  isCompleting,
}: {
  reminder: ReminderWithPromise;
  open: boolean;
  isToday: boolean;
  onReminderClick: (reminder: ReminderWithPromise) => void;
  onCompleteClick: (reminder: ReminderWithPromise, e: React.MouseEvent) => void;
  onDeleteClick: (reminder: ReminderWithPromise, e: React.MouseEvent) => void;
  isCompleting: boolean;
}) {
  const relativeTime = useRelativeTime(reminder.reminder_date, open);
  
  // Formatear fecha
  const formatDate = (date: Date | string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  };

  const eventName = reminder.promise?.name || reminder.promise?.contact?.name || 'Evento';
  const eventTypeName = reminder.promise?.event_type?.name || null;
  const eventDate = reminder.promise?.event_date;
  const subjectText = reminder.subject_text || 'Recordatorio';
  const reminderDate = reminder.reminder_date;

  return (
    <ZenDropdownMenuItem
      className={cn(
        'flex flex-col items-start gap-1 px-3 py-3 cursor-pointer relative group'
      )}
      onClick={() => onReminderClick(reminder)}
    >
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {/* Botón Completar - Solo en sección Hoy */}
        {isToday && (
          <button
            onClick={(e) => onCompleteClick(reminder, e)}
            disabled={isCompleting}
            className={cn(
              "p-1.5 rounded hover:bg-zinc-700 text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
            )}
            title="Completar recordatorio"
          >
            {isCompleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </button>
        )}
        {/* Botón Eliminar */}
        <button
          onClick={(e) => onDeleteClick(reminder, e)}
          className={cn(
            "p-1.5 rounded hover:bg-zinc-700 text-red-400 hover:text-red-300 transition-colors"
          )}
          title="Eliminar recordatorio"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-start gap-2 w-full pr-20">
        <div className="flex-1 min-w-0">
          {/* Nombre del evento */}
          <p className="text-sm font-medium text-zinc-200 line-clamp-2">
            {eventName}
          </p>
          
          {/* Tipo evento • Fecha de evento {fecha evento} */}
          {eventTypeName && eventDate && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-zinc-400">
                {eventTypeName}
              </span>
              <span className="text-xs text-zinc-600">•</span>
              <span className="text-xs text-zinc-500">Fecha de evento</span>
              <span className="text-xs text-zinc-500">
                {formatDate(eventDate)}
              </span>
            </div>
          )}
          
          {/* Icono reloj asunto • fecha de recordatorio */}
          <div className="flex items-center gap-1.5 mt-1">
            <AlarmClockCheck className="h-3 w-3 text-zinc-500 flex-shrink-0" />
            <span className="text-xs text-zinc-400 line-clamp-1">
              {subjectText}
            </span>
            <span className="text-xs text-zinc-600">•</span>
            <span className="text-xs text-zinc-500">
              {formatDate(reminderDate)}
            </span>
          </div>
        </div>
      </div>
    </ZenDropdownMenuItem>
  );
}
