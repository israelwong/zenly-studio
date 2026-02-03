'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { formatDisplayDateLong } from '@/lib/utils/date-formatter';

interface PublicPromisePageHeaderProps {
  prospectName: string;
  eventName: string | null;
  eventTypeName: string | null;
  eventDate: Date | string | null;
  variant?: 'pendientes' | 'negociacion' | 'cierre'; // Mantenido para compatibilidad pero no se usa
  isContractSigned?: boolean;
  minDaysToHire?: number;
  // Covers multimedia del tipo de evento
  coverImageUrl?: string | null;
  coverVideoUrl?: string | null;
  coverMediaType?: 'image' | 'video' | null;
  coverDesignVariant?: 'solid' | 'gradient' | null; // Mantenido para compatibilidad pero no se usa
  // Modo preview para el editor
  isPreviewMode?: boolean;
}

/**
 * Header con cover multimedia
 * Estructura: Cover arriba → Textos abajo (fondo sólido)
 * Mobile: fullwidth | Desktop: rounded-xl + margin-top
 */
export function PublicPromisePageHeader({
  prospectName,
  eventName,
  eventTypeName,
  eventDate,
  variant,
  isContractSigned = false,
  minDaysToHire = 30,
  coverImageUrl,
  coverVideoUrl,
  coverMediaType,
  coverDesignVariant,
  isPreviewMode = false,
}: PublicPromisePageHeaderProps) {
  // Parsear fecha
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

  // Calcular días restantes hasta el evento
  const daysUntilEvent = dateObj
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

  // Calcular fecha recomendada (eventDate - minDaysToHire)
  const recommendedDate = dateObj && minDaysToHire
    ? (() => {
        const recommended = new Date(dateObj);
        recommended.setDate(recommended.getDate() - minDaysToHire);
        return recommended;
      })()
    : null;

  const formattedRecommendedDate = recommendedDate ? formatDisplayDateLong(recommendedDate) : null;

  // Determinar si hay cover multimedia
  const hasCover = coverMediaType === 'image' && coverImageUrl || coverMediaType === 'video' && coverVideoUrl;

  // Estilos condicionales: en preview mode (mobile) siempre sin rounded ni margin
  const sectionClasses = isPreviewMode
    ? 'relative overflow-hidden'
    : `relative overflow-hidden ${!hasCover ? 'md:mt-6 md:mx-4 md:rounded-xl' : 'md:max-w-4xl md:mx-auto md:mt-6 md:rounded-xl'}`;
  
  const coverClasses = isPreviewMode
    ? 'relative aspect-[16/10] w-full overflow-hidden'
    : 'relative aspect-[16/10] w-full overflow-hidden rounded-none md:rounded-t-xl';

  return (
    <section className={sectionClasses}>
      {/* Cover multimedia - Arriba */}
      {hasCover && (
        <div className={coverClasses}>
          {coverMediaType === 'video' && coverVideoUrl ? (
            <video
              src={coverVideoUrl}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : coverMediaType === 'image' && coverImageUrl ? (
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${coverImageUrl})` }}
            />
          ) : null}

          {/* Badge de tipo de evento - Superpuesto en la parte inferior, centrado con efecto cristal líquido */}
          {eventTypeName && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
              <span 
                className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-[2px] border border-white/20 text-white shadow-lg shadow-black/20"
                style={{
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.4), 0 0 6px rgba(0, 0, 0, 0.2)',
                }}
              >
                {eventTypeName}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Sección de textos - Fondo sólido */}
      <div className={`relative bg-zinc-950 ${hasCover ? (isPreviewMode ? 'pt-3 pb-2' : 'pt-4 pb-2 md:pt-5 md:pb-8') : (isPreviewMode ? 'py-6' : 'py-8 md:py-10')} ${isPreviewMode ? '' : 'md:rounded-b-xl'}`}>
        <div className="max-w-4xl mx-auto px-4 mt-6">
          {/* Badge de tipo de evento (solo si NO hay cover) */}
          {!hasCover && eventTypeName && (
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium bg-zinc-800/50 text-zinc-300 border border-zinc-700/50">
                {eventTypeName}
              </span>
            </div>
          )}

          {/* Contenido centrado */}
          <div className="text-center">
            {/* Saludo grande */}
            <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold text-white ${isPreviewMode ? 'mb-3' : 'mb-4'}`}>
              ¡Hola, {prospectName}!
            </h1>

            {/* Descripción principal */}
            <p className={`text-sm md:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed ${isPreviewMode ? 'mb-3' : 'mb-4'}`}>
              Te compartimos las opciones para el evento de{' '}
              <span className="text-white font-semibold">{eventName || eventTypeName || 'evento'}</span>
              {dateObj && formattedDate && (
                <> que se celebrará <span className="text-white font-semibold">{formattedDate}</span></>
              )}
              {!dateObj && '.'}
            </p>

            {/* Mensaje de asesoría secundario */}
            {dateObj && formattedRecommendedDate && daysUntilEvent !== null && (
              <p className={`text-xs md:text-sm text-zinc-400 max-w-2xl mx-auto text-center ${isPreviewMode ? '' : 'mb-4'}`}>
                Te recomendamos formalizar antes del <span className="text-white font-medium">{formattedRecommendedDate}</span>. Ten en cuenta que <span className="text-amber-400/90 font-semibold">la disponibilidad de la fecha no está garantizada</span> y puede ser reservada por otro cliente sin previo aviso hasta completar la firma y el anticipo.
              </p>
            )}

            {/* Icono animado para invitar a hacer scroll */}
            <div className={`flex justify-center ${isPreviewMode ? 'mt-5 mb-4' : 'mt-4 mb-1'}`}>
              <div className="animate-bounce">
                <ChevronDown className="w-6 h-6 text-zinc-500" />
              </div>
            </div>

            {/* Skeleton para mobile preview - Cotizaciones */}
            {isPreviewMode && (
              <div className="mt-2 space-y-4">
                <div className="space-y-2">
                  <div className="h-6 bg-zinc-800 rounded w-48 animate-pulse" />
                  <div className="h-4 bg-zinc-800/50 rounded w-64 animate-pulse" />
                </div>
                {/* Card skeleton */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3 animate-pulse">
                  <div className="h-4 bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800/50 rounded w-full" />
                  <div className="h-3 bg-zinc-800/50 rounded w-5/6" />
                  <div className="h-8 bg-zinc-800 rounded w-24 mt-4" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
