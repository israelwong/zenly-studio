'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Video, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortfolioNudgeProps {
  /** Si hay portafolios disponibles para mostrar */
  hasPortfolios: boolean;
}

export function PortfolioNudge({ hasPortfolios }: PortfolioNudgeProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[PortfolioNudge] Componente montado, hasPortfolios:', hasPortfolios);
  }, [hasPortfolios]);

  const handleScroll = useCallback(() => {
    if (!isVisible) return;
    
    const portfolioSection = document.getElementById('portfolio-section');
    if (portfolioSection) {
      const rect = portfolioSection.getBoundingClientRect();
      // Si el usuario ya pasó la sección (está arriba de la pantalla), ocultar
      if (rect.bottom < 0 || rect.top < window.innerHeight * 0.3) {
        setIsVisible(false);
      }
    }
  }, [isVisible]);

  useEffect(() => {
    // Solo mostrar si hay portafolios disponibles
    if (!hasPortfolios || isDismissed) return;

    // Mostrar después de 5 segundos sin condiciones adicionales
    timeoutRef.current = setTimeout(() => {
      console.log('[PortfolioNudge] Mostrando nudge después de 5 segundos');
      setIsVisible(true);
    }, 5000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [hasPortfolios, isDismissed]);

  useEffect(() => {
    if (!isVisible) return;
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isVisible, handleScroll]);

  const handleClick = () => {
    const portfolioSection = document.getElementById('portfolio-section');
    if (portfolioSection) {
      portfolioSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsVisible(false);
    setIsDismissed(true);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
  };

  // Renderizar siempre para que el timeout funcione, pero solo mostrar contenido si es visible
  if (!hasPortfolios) return null;

  return (
    <>
      <style>{`
        @keyframes fadeInBounce {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          50% {
            transform: translateY(-5px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .portfolio-nudge-enter {
          animation: fadeInBounce 0.5s ease-out;
        }
      `}</style>
      {isVisible && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-[9999] max-w-sm portfolio-nudge-enter',
            'transition-all'
          )}
        >
        <div
        className={cn(
          'bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50',
          'rounded-lg shadow-xl shadow-black/50',
          'p-4 flex items-start gap-3',
          'hover:border-emerald-500/50 transition-colors duration-200'
        )}
      >
        {/* Icono - Multimedia (Foto + Video) */}
        <div className="shrink-0 mt-0.5">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <div className="flex items-center">
              <Camera className="w-4 h-4 text-emerald-300" />
              <Video className="w-4 h-4 text-emerald-300 ml-0.5" />
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium leading-relaxed">
            📸 Mira cómo capturamos estos momentos.{' '}
            <button
              onClick={handleClick}
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 font-semibold transition-colors"
            >
              Ver portafolio
            </button>
            .
          </p>
        </div>

        {/* Botón cerrar */}
        <button
          onClick={handleDismiss}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
        </div>
        </div>
      )}
    </>
  );
}
