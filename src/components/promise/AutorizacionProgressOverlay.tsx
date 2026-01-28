'use client';

import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';

interface AutorizacionProgressOverlayProps {
  show: boolean;
  currentTask: string;
  completedTasks: string[];
  error: string | null;
  onClose?: () => void;
}

const TASKS = [
  'Obteniendo catálogo de servicios',
  'Calculando precios y desglose',
  'Guardando cotización autorizada',
  'Creando evento en agenda',
  'Actualizando estado de cotización',
  'Archivando otras cotizaciones de la promesa',
  'Registrando pago inicial',
  'Finalizando autorización',
];

export function AutorizacionProgressOverlay({
  show,
  currentTask,
  completedTasks,
  error,
  onClose,
}: AutorizacionProgressOverlayProps) {
  if (!show || typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      style={{
        zIndex: 99999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <ZenCard className="max-w-md w-full p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">
            {error ? 'Error al autorizar' : 'Autorizando cotización'}
          </h3>
          <p className="text-sm text-zinc-400">
            {error
              ? 'Ocurrió un error durante el proceso'
              : 'Por favor espera mientras procesamos tu solicitud'}
          </p>
        </div>

        {error ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-red-400 font-medium mb-2">Error al procesar</p>
              <p className="text-sm text-zinc-400 mb-4">{error}</p>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {TASKS.map((task, index) => {
              const isCompleted = completedTasks.includes(task);
              const isCurrent = currentTask === task;
              const isPending = !isCompleted && !isCurrent;

              return (
                <div
                  key={task}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isCurrent
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : isCompleted
                        ? 'bg-zinc-800/50'
                        : 'bg-zinc-900/50 opacity-50'
                    }`}
                >
                  <div className="shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-zinc-600" />
                    )}
                  </div>
                  <span
                    className={`text-sm ${isCurrent
                        ? 'text-emerald-400 font-medium'
                        : isCompleted
                          ? 'text-zinc-300'
                          : 'text-zinc-500'
                      }`}
                  >
                    {task}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </ZenCard>
    </div>,
    document.body
  );
}
