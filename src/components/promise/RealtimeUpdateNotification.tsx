'use client';

import { useEffect, useState, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';

interface RealtimeUpdateNotificationProps {
  pendingUpdate: { 
    count: number; 
    type: 'quote' | 'promise' | 'both';
    changeType?: 'price' | 'description' | 'name' | 'inserted' | 'deleted' | 'general';
    requiresManualUpdate?: boolean; // Si es false, los cambios ya se actualizaron automáticamente
  } | null;
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
  const autoDismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pendingUpdate && pendingUpdate.count > 0) {
      setIsVisible(true);
      
      // Auto-dismiss solo si NO requiere actualización manual (ya se actualizó automáticamente)
      // Si requiere actualización manual, mantener visible hasta que el usuario interactúe
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
      
      // Si los cambios ya se actualizaron automáticamente, auto-dismiss después de 5 segundos
      if (pendingUpdate.requiresManualUpdate === false) {
        autoDismissTimeoutRef.current = setTimeout(() => {
          handleDismiss();
        }, 5000);
      }
    } else {
      setIsVisible(false);
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
    }

    return () => {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
    };
  }, [pendingUpdate]);

  const handleUpdate = async () => {
    if (autoDismissTimeoutRef.current) {
      clearTimeout(autoDismissTimeoutRef.current);
    }
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
    if (autoDismissTimeoutRef.current) {
      clearTimeout(autoDismissTimeoutRef.current);
    }
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible || !pendingUpdate || pendingUpdate.count === 0) {
    return null;
  }

  // Si los cambios ya se actualizaron automáticamente, no mostrar botón de actualizar
  const requiresManualUpdate = pendingUpdate.requiresManualUpdate !== false;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-4xl mx-auto px-4 pb-4">
        <div className="bg-emerald-950/40 backdrop-blur-xl border border-emerald-700/30 rounded-lg shadow-2xl shadow-emerald-900/20 px-4 py-3 pointer-events-auto animate-in slide-in-from-bottom-2 duration-300 fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="shrink-0">
                <RefreshCw className={`h-4 w-4 ${requiresManualUpdate ? 'text-emerald-400' : 'text-blue-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100">Hubo cambios en la información</p>
                {requiresManualUpdate ? (
                  <p className="text-xs text-zinc-400 mt-0.5">Haz clic para actualizar</p>
                ) : (
                  <p className="text-xs text-zinc-400 mt-0.5">Los cambios se han aplicado automáticamente</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {requiresManualUpdate && (
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-md transition-colors"
                  aria-label="Actualizar datos"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                  <span>{isUpdating ? 'Actualizando...' : 'Actualizar'}</span>
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="text-zinc-400 hover:text-zinc-200 transition-colors rounded p-1 hover:bg-zinc-800"
                aria-label="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
