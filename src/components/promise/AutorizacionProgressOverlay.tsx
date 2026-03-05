'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { XCircle, Loader2 } from 'lucide-react';
import { ZenCard, ZenButton } from '@/components/ui/zen';

interface AutorizacionProgressOverlayProps {
  show: boolean;
  progress: number;
  error: string | null;
  successReceived?: boolean;
  onClose?: () => void;
}

function runConfetti() {
  const cfg = { zIndex: 2147483647 };
  
  confetti({ 
    particleCount: 100, 
    spread: 70, 
    origin: { y: 0.6 }, 
    colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'], 
    ...cfg 
  });

  setTimeout(() => {
    confetti({ 
      particleCount: 50, 
      angle: 60, 
      spread: 55, 
      origin: { x: 0 }, 
      colors: ['#10b981', '#3b82f6'], 
      ...cfg 
    });
    confetti({ 
      particleCount: 50, 
      angle: 120, 
      spread: 55, 
      origin: { x: 1 }, 
      colors: ['#10b981', '#3b82f6'], 
      ...cfg 
    });
  }, 250);

  setTimeout(() => {
    confetti({ 
      particleCount: 30, 
      spread: 100, 
      origin: { y: 0.7 }, 
      colors: ['#10b981'], 
      ...cfg 
    });
  }, 500);
}

export function AutorizacionProgressOverlay({
  show,
  progress,
  error,
  successReceived = false,
  onClose,
}: AutorizacionProgressOverlayProps) {
  const isSuccess = successReceived && !error;

  const confettiFiredRef = useRef(false);
  useEffect(() => {
    if (!isSuccess || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    runConfetti();
  }, [isSuccess]);

  useEffect(() => {
    if (!show) confettiFiredRef.current = false;
  }, [show]);

  if (!show || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="overlay-title"
      aria-describedby="overlay-description"
    >
      <ZenCard className="max-w-sm w-full p-8 overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-white">Error al autorizar</h3>
              <p className="text-sm text-red-400">{error}</p>
            </div>
            {onClose && (
              <ZenButton variant="secondary" onClick={onClose} className="mt-2">
                Cerrar
              </ZenButton>
            )}
          </div>
        ) : isSuccess ? (
          <div className="flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center animate-scale-in">
              <svg className="w-9 h-9 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>

            <div className="text-center space-y-3">
              <h3 id="overlay-title" className="text-xl font-semibold text-white">
                ¡Evento creado exitosamente!
              </h3>
              
              <div id="overlay-description" className="flex items-center justify-center gap-3 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400" aria-hidden />
                <p>
                  Un momento, estamos preparando el resumen de tu cotización aprobada...
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <h3 id="overlay-title" className="text-lg font-semibold text-white">
                Autorizando cotización
              </h3>
            </div>

            <div className="w-full space-y-3">
              <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.min(progress, 90)}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
                </div>
              </div>

              <p id="overlay-description" className="text-sm text-zinc-400 text-center animate-pulse">
                Procesando tu solicitud…
              </p>
            </div>
          </div>
        )}
      </ZenCard>
    </div>,
    document.body,
  );
}
