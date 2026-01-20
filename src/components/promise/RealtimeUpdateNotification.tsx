'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X, FileText, Calendar } from 'lucide-react';

interface RealtimeUpdateNotificationProps {
  pendingUpdate: { count: number; type: 'quote' | 'promise' | 'both' } | null;
  onUpdate: () => Promise<void>;
  onDismiss?: () => void;
}

export function RealtimeUpdateNotification({
  pendingUpdate,
  onUpdate,
  onDismiss,
}: RealtimeUpdateNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (pendingUpdate && pendingUpdate.count > 0) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [pendingUpdate]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate();
      setIsVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    } catch (error) {
      console.error('[RealtimeUpdateNotification] Error al actualizar:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible || !pendingUpdate || pendingUpdate.count === 0) {
    return null;
  }

  // ⚠️ TAREA 2: Mensajes específicos según el tipo de actualización
  const getMessage = () => {
    if (pendingUpdate.type === 'quote') {
      return {
        title: 'Se han actualizado las cotizaciones',
        subtitle: 'Haz clic para ver los cambios',
        icon: <FileText className="h-4 w-4 text-emerald-400" />,
      };
    } else if (pendingUpdate.type === 'promise') {
      return {
        title: 'La información del evento ha sido actualizada',
        subtitle: 'Haz clic para ver los cambios',
        icon: <Calendar className="h-4 w-4 text-emerald-400" />,
      };
    } else {
      return {
        title: `Se han detectado ${pendingUpdate.count} cambios`,
        subtitle: 'Haz clic para actualizar',
        icon: <RefreshCw className="h-4 w-4 text-emerald-400" />,
      };
    }
  };

  const message = getMessage();

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none max-w-md w-full px-4"
      role="alert"
      aria-live="polite"
    >
      <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800/50 rounded-lg shadow-2xl px-4 py-3 pointer-events-auto animate-in slide-in-from-bottom-4 duration-300 fade-in">
        <div className="flex items-center gap-3">
          <div className="shrink-0">{message.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-100">{message.title}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{message.subtitle}</p>
          </div>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
            aria-label="Actualizar datos"
          >
            <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isUpdating ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
          <button
            onClick={handleDismiss}
            className="shrink-0 text-zinc-400 hover:text-zinc-200 transition-colors rounded p-1 hover:bg-zinc-800"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
