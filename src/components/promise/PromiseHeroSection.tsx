'use client';

import React from 'react';
import { Calendar, MapPin, Sparkles } from 'lucide-react';
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
  // Formatear fecha
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('es-MX', {
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
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-zinc-950 to-zinc-950" />
      
      {/* Pattern de fondo */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Logo del estudio */}
        {studioLogoUrl && (
          <div className="flex justify-center mb-6">
            <div className="relative h-16 w-16 md:h-20 md:w-20">
              <img
                src={studioLogoUrl}
                alt={studioName}
                className="w-full h-full object-contain rounded-full ring-2 ring-emerald-500/20"
              />
            </div>
          </div>
        )}

        {/* Saludo personalizado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-300">
              Información de tu evento
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            ¡Hola, {contactName}!
          </h1>

          <p className="text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto">
            Te compartimos la información solicitada para tu{' '}
            <span className="text-emerald-400 font-semibold">
              {eventTypeName || 'evento especial'}
            </span>
          </p>
        </div>

        {/* Información del evento */}
        <ZenCard className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800">
          <ZenCardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fecha del evento */}
              {eventDate && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Calendar className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-zinc-500 mb-1">Fecha del Evento</p>
                    <p className="text-sm font-semibold text-white capitalize">
                      {formattedDate}
                    </p>
                    {daysRemaining !== null && daysRemaining > 0 && (
                      <p className="text-xs text-zinc-400 mt-1">
                        {daysRemaining === 1
                          ? '¡Mañana!'
                          : `Faltan ${daysRemaining} días`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Ubicación */}
              {eventLocation && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <MapPin className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-zinc-500 mb-1">Ubicación</p>
                    <p className="text-sm font-semibold text-white">
                      {eventLocation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ZenCardContent>
        </ZenCard>

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

