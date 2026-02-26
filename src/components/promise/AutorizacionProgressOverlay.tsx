'use client';

import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, Loader2, FileText, Calendar } from 'lucide-react';
import { ZenCard, ZenButton } from '@/components/ui/zen';

interface AutorizacionProgressOverlayProps {
  show: boolean;
  currentTask: string;
  completedTasks: string[];
  error: string | null;
  /** Solo true cuando el servidor respondió con éxito (await). Pantalla de éxito y confeti se muestran solo entonces. */
  successReceived?: boolean;
  eventoId?: string | null;
  studioSlug?: string;
  promiseId?: string;
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

function runConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'],
    zIndex: 2147483647,
  });
  setTimeout(() => {
    confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#10b981', '#3b82f6'], zIndex: 2147483647 });
    confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#10b981', '#3b82f6'], zIndex: 2147483647 });
  }, 250);
  setTimeout(() => {
    confetti({ particleCount: 30, spread: 100, origin: { y: 0.7 }, colors: ['#10b981'], zIndex: 2147483647 });
  }, 500);
}

export function AutorizacionProgressOverlay({
  show,
  currentTask,
  completedTasks,
  error,
  successReceived = false,
  eventoId,
  studioSlug,
  promiseId,
  onClose,
}: AutorizacionProgressOverlayProps) {
  const router = useRouter();

  // Pantalla de éxito solo cuando el servidor respondió con éxito (successReceived), no por la animación
  const showSuccessScreen = successReceived && !error;

  // Confeti una sola vez cuando se muestra la pantalla de éxito (overlay se renderiza en un solo lugar en el árbol)
  useEffect(() => {
    if (!show || !showSuccessScreen) return;
    runConfetti();
  }, [show, showSuccessScreen]);

  const handleNavigate = useCallback(
    (url: string) => {
      onClose?.();
      router.refresh();
      setTimeout(() => router.push(url), 100);
    },
    [router, onClose]
  );

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
      <ZenCard className="max-w-md w-full min-w-0 p-6 overflow-hidden">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">
            {error ? 'Error al autorizar' : showSuccessScreen ? 'Autorización completada' : 'Autorizando cotización'}
          </h3>
          <p className="text-sm text-zinc-400">
            {error
              ? 'Ocurrió un error durante el proceso'
              : showSuccessScreen
                ? 'Elige una opción para continuar.'
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
                <ZenButton variant="secondary" onClick={onClose}>
                  Cerrar
                </ZenButton>
              )}
            </div>
          </div>
        ) : showSuccessScreen ? (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="flex justify-center w-16 h-16 rounded-full bg-emerald-500/20 shrink-0">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 m-auto" />
            </div>
            <p className="text-lg font-semibold text-white">¡Éxito!</p>
            <p className="text-sm text-zinc-400 text-center">
              Cotización autorizada y evento creado. Elige a dónde ir:
            </p>
            <div className="flex flex-col gap-3 w-full">
              <ZenButton
                className="w-full justify-center gap-2"
                onClick={() =>
                  studioSlug &&
                  promiseId &&
                  handleNavigate(`/${studioSlug}/studio/commercial/promises/${promiseId}/autorizada`)
                }
                disabled={!studioSlug || !promiseId}
              >
                <FileText className="w-4 h-4 shrink-0" />
                Ver Resumen Comercial
              </ZenButton>
              {eventoId && studioSlug && (
                <ZenButton
                  variant="secondary"
                  className="w-full justify-center gap-2"
                  onClick={() => handleNavigate(`/${studioSlug}/studio/business/events/${eventoId}`)}
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  Ir a Gestión de Evento
                </ZenButton>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {TASKS.map((task, index) => {
              const isLastStep = index === TASKS.length - 1;
              const animationCompleted = completedTasks.includes(task);
              // Último paso: sigue en loading hasta que el servidor responda (successReceived)
              const isCurrent =
                currentTask === task || (isLastStep && !successReceived && animationCompleted);
              const isCompleted =
                animationCompleted && (successReceived || !isLastStep);

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
