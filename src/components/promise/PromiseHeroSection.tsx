'use client';

import React from 'react';
import { formatDisplayDateLong } from '@/lib/utils/date-formatter';

interface PromiseHeroSectionProps {
  contactName: string;
  eventTypeName: string | null;
  eventDate: Date | string | null;
  studioName: string;
  studioLogoUrl: string | null;
}

export function PromiseHeroSection({
  contactName,
  eventTypeName,
  eventDate,
  studioName,
  studioLogoUrl,
}: PromiseHeroSectionProps) {
  // Parsear fecha usando métodos UTC
  const parseDate = (date: Date | string | null): Date | null => {
    if (!date) return null;
    if (typeof date === 'string') {
      const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      }
      return new Date(date);
    }
    return date;
  };

  const dateObj = parseDate(eventDate);
  const formattedDate = dateObj ? formatDisplayDateLong(dateObj) : null;

  // Calcular días restantes usando métodos UTC
  const daysRemaining = dateObj
    ? (() => {
      const today = new Date();
      const todayUtc = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate()
      ));
      const eventUtc = new Date(Date.UTC(
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth(),
        dateObj.getUTCDate()
      ));
      const diffTime = eventUtc.getTime() - todayUtc.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    })()
    : null;

  return (
    <section className="relative overflow-hidden">
      {/* Fondo degradado */}
      <div className="absolute inset-0 bg-linear-to-b from-zinc-900/40 via-zinc-950 to-zinc-950" />

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

