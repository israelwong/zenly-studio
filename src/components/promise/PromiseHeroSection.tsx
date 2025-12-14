'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';

interface PromiseHeroSectionProps {
  contactName: string;
  eventTypeName: string | null;
  eventDate: Date | null;
  eventLocation: string | null;
  studioName: string;
  studioLogoUrl: string | null;
}

export function PromiseHeroSection({
  contactName,
  eventTypeName,
  eventDate,
  eventLocation,
  studioName,
  studioLogoUrl,
}: PromiseHeroSectionProps) {
  // Formatear fecha con día de la semana
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    : null;

  // Calcular días restantes
  const daysRemaining = eventDate
    ? Math.ceil(
      (new Date(eventDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
    )
    : null;

  return (
    <section className="relative overflow-hidden">
      {/* Fondo degradado */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/40 via-zinc-950 to-zinc-950" />

      {/* Pattern de fondo */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Saludo personalizado */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            ¡Hola, {contactName}!
          </h1>

          <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Te compartimos la información solicitada para tu evento{' '}
            <span className="text-white font-bold">
              {eventTypeName || 'especial'}
            </span>
            {eventDate && formattedDate && (
              <>
                {' '}que se celebrará el{' '}
                <span className="text-white font-semibold">
                  {formattedDate}
                </span>
                {daysRemaining !== null && daysRemaining > 0 && (
                  <span className="text-amber-400">
                    {' '}({daysRemaining === 1 ? '¡mañana!' : `en ${daysRemaining} días`})
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        {/* Información del evento */}
        {eventLocation && (
          <ZenCard className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800">
            <ZenCardContent className="p-6">
              <div className="flex items-start gap-3 justify-center md:justify-start">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <MapPin className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-zinc-500 mb-1">Ubicación del Evento</p>
                  <p className="text-sm font-semibold text-white">
                    {eventLocation}
                  </p>
                </div>
              </div>
            </ZenCardContent>
          </ZenCard>
        )}

        {/* Indicador de scroll (solo mobile) */}
        <div className="mt-8 flex justify-center md:hidden">
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <p className="text-xs">Desliza para ver más</p>
            <div className="animate-bounce">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

