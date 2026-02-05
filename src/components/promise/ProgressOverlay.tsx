'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, RefreshCw, FileSignature, ArrowRight } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { ProgressStepItem } from './ProgressStepItem';
import confetti from 'canvas-confetti';

type ProgressStep = 'validating' | 'sending' | 'registering' | 'collecting' | 'generating_contract' | 'preparing' | 'completed' | 'error';

interface ProgressOverlayProps {
  show: boolean;
  currentStep: ProgressStep;
  error: string | null;
  autoGenerateContract?: boolean;
  studioSlug?: string;
  promiseId?: string;
  contactName?: string;
  onClose?: () => void;
  onRetry?: () => void;
}

const getStepLabel = (step: ProgressStep): string => {
  switch (step) {
    case 'validating':
      return 'Validando datos encriptados';
    case 'sending':
      return 'Enviando solicitud a estudio';
    case 'registering':
      return 'Registrando solicitud';
    case 'collecting':
      return 'Recopilando información';
    case 'generating_contract':
      return 'Generando contrato';
    case 'preparing':
      return 'Preparando flujo de contratación';
    case 'completed':
      return 'Listo';
    case 'error':
      return 'Error';
    default:
      return '';
  }
};

export function ProgressOverlay({
  show,
  currentStep,
  error,
  autoGenerateContract = false,
  studioSlug,
  promiseId,
  contactName,
  onClose,
  onRetry,
}: ProgressOverlayProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const confettiTriggeredRef = useRef(false);
  
  // Extraer solo el primer nombre
  const firstName = contactName?.split(' ')[0] || '';

  // Skip render si no debe mostrarse o si no hay window
  if (!show || typeof window === 'undefined') {
    return null;
  }

  const handleProceedToContract = async () => {
    if (!studioSlug || !promiseId) {
      return;
    }

    setIsNavigating(true);
    
    try {
      // Paso 1: Refrescar router para invalidar caché local
      router.refresh();
      
      // Paso 2: Pequeña pausa para que el refresh tome efecto
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Paso 3: Navegar a cierre con timestamp único
      const timestamp = Date.now();
      const redirectUrl = `/${studioSlug}/promise/${promiseId}/cierre?t=${timestamp}`;
      
      window.location.assign(redirectUrl);
    } catch (error) {
      setIsNavigating(false);
    }
  };

  // 🎉 Confetti: Disparar cuando llega a completed
  useEffect(() => {
    // Si overlay está oculto, resetear flag
    if (!show) {
      confettiTriggeredRef.current = false;
      return;
    }

    // Si está en completed y NO se ha disparado, disparar confetti
    if (currentStep === 'completed' && !confettiTriggeredRef.current) {
      confettiTriggeredRef.current = true;
      
      // Primera ráfaga: Centro
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
        zIndex: 2147483647,
      });
      
      // Segunda ráfaga: Lados (250ms después)
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10b981', '#3b82f6', '#8b5cf6'],
          zIndex: 2147483647,
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#3b82f6', '#8b5cf6'],
          zIndex: 2147483647,
        });
      }, 250);
      
      // Tercera ráfaga: Extra (500ms después)
      setTimeout(() => {
        confetti({
          particleCount: 30,
          spread: 100,
          origin: { y: 0.7 },
          colors: ['#10b981', '#10b981', '#10b981'],
          zIndex: 2147483647,
        });
      }, 500);
    }
    
    // Si NO está en completed, resetear flag para permitir nuevo confetti
    if (currentStep !== 'completed') {
      confettiTriggeredRef.current = false;
    }
  }, [currentStep, show]);

  const portalContent = (
    <div
      id="progress-overlay-container"
      style={{ 
        zIndex: 2147483647, // MAX z-index posible
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div
        style={{
          maxWidth: '28rem',
          width: '100%',
          backgroundColor: '#18181b',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          border: '1px solid #27272a',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
          position: 'relative',
          zIndex: 2147483647,
        }}
      >
        {/* Header - Solo mostrar si NO está en completed (completed tiene su propio header) */}
        {currentStep !== 'completed' && (
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 600, 
              color: '#ffffff', 
              marginBottom: '0.5rem' 
            }}>
              {currentStep === 'generating_contract' 
                ? 'Generando tu contrato...'
                : 'Iniciando proceso de contratación'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#a1a1aa' }}>
              {currentStep === 'generating_contract'
                ? 'Creando tu contrato personalizado. Esto tomará unos segundos...'
                : 'Por favor espera mientras procesamos tu solicitud'}
            </p>
          </div>
        )}

        {error ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-red-400 font-medium mb-2">Error al procesar</p>
              <p className="text-sm text-zinc-400 mb-4">{error}</p>
              <div className="flex gap-3">
                {onClose && (
                  <ZenButton
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cerrar
                  </ZenButton>
                )}
                {onRetry && (
                  <ZenButton
                    onClick={onRetry}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reintentar
                  </ZenButton>
                )}
              </div>
            </div>
          </div>
        ) : currentStep === 'completed' ? (
          /* ==================== COMPLETED STATE REDESIGN ==================== */
          <div className="space-y-6">
            {/* 1. HEADER SECTION */}
            <div className="flex flex-col items-center space-y-4">
              {/* Large Animated Check Icon */}
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 ring-4 ring-emerald-500/20 animate-pulse">
                <CheckCircle2 className="h-12 w-12 text-emerald-400" strokeWidth={2.5} />
              </div>
              
              {/* Title & Subtitle Group */}
              <div className="flex flex-col items-center space-y-2">
                {/* Title */}
                <h2 className="text-2xl font-bold text-white text-center">
                  Contrato generado con éxito
                </h2>
                
                {/* Subtitle */}
                <p className="text-sm text-zinc-400 text-center max-w-md">
                  {firstName && <span className="font-semibold text-zinc-300">{firstName}</span>}
                  {firstName ? ', e' : 'E'}stamos a un solo paso de asegurar tu fecha!
                </p>
              </div>
            </div>

            {/* 2. DIVIDER */}
            <hr className="border-t border-zinc-700/50" />

            {/* 3. MIDDLE SECTION - Process Checklist */}
            <div className="space-y-3">
              <ProgressStepItem
                label={getStepLabel('collecting')}
                completed={true}
                active={false}
              />
              <ProgressStepItem
                label={getStepLabel('validating')}
                completed={true}
                active={false}
              />
              <ProgressStepItem
                label={getStepLabel('sending')}
                completed={true}
                active={false}
              />
              <ProgressStepItem
                label={getStepLabel('registering')}
                completed={true}
                active={false}
              />
              {autoGenerateContract && (
                <ProgressStepItem
                  label={getStepLabel('generating_contract')}
                  completed={true}
                  active={false}
                />
              )}
            </div>

            {/* 4. DIVIDER */}
            <hr className="border-t border-zinc-700/50" />

            {/* 5. FOOTER SECTION */}
            <div className="flex flex-col items-center space-y-4">
              {/* Instruction */}
              <p className="text-sm text-zinc-400 text-center">
                Ahora puedes revisarlo y firmarlo para asegurar tu fecha. Tu progreso está guardado.
              </p>
              
              {/* Premium Button */}
              <ZenButton
                onClick={handleProceedToContract}
                disabled={isNavigating}
                className="max-w-sm relative group"
                size="md"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                }}
              >
                {isNavigating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    Revisar contrato para firma
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </ZenButton>
            </div>
          </div>
        ) : (
          /* ==================== PROGRESS STATE (NOT COMPLETED) ==================== */
          <div className="space-y-4">
            {/* Pasos según autoGenerateContract */}
            {autoGenerateContract ? (
              <>
                <ProgressStepItem
                  label={getStepLabel('collecting')}
                  completed={['validating', 'sending', 'registering', 'generating_contract', 'completed'].includes(currentStep)}
                  active={currentStep === 'collecting'}
                />
                <ProgressStepItem
                  label={getStepLabel('validating')}
                  completed={['sending', 'registering', 'generating_contract', 'completed'].includes(currentStep)}
                  active={currentStep === 'validating'}
                />
                <ProgressStepItem
                  label={getStepLabel('sending')}
                  completed={['registering', 'generating_contract', 'completed'].includes(currentStep)}
                  active={currentStep === 'sending'}
                />
                <ProgressStepItem
                  label={getStepLabel('registering')}
                  completed={['generating_contract', 'completed'].includes(currentStep)}
                  active={currentStep === 'registering'}
                />
                <ProgressStepItem
                  label={getStepLabel('generating_contract')}
                  completed={currentStep === 'completed'}
                  active={currentStep === 'generating_contract'}
                />
              </>
            ) : (
              <>
                <ProgressStepItem
                  label={getStepLabel('collecting')}
                  completed={['validating', 'sending', 'registering', 'completed'].includes(currentStep)}
                  active={currentStep === 'collecting'}
                />
                <ProgressStepItem
                  label={getStepLabel('validating')}
                  completed={['sending', 'registering', 'completed'].includes(currentStep)}
                  active={currentStep === 'validating'}
                />
                <ProgressStepItem
                  label={getStepLabel('sending')}
                  completed={['registering', 'completed'].includes(currentStep)}
                  active={currentStep === 'sending'}
                />
                <ProgressStepItem
                  label={getStepLabel('registering')}
                  completed={currentStep === 'completed'}
                  active={currentStep === 'registering'}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(portalContent, document.body);
}

