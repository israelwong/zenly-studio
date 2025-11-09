'use client';

import React from 'react';
import { Calendar, User, Phone, Mail, Tag, Share2, MapPin } from 'lucide-react';
import { formatDate } from '@/lib/actions/utils/formatting';

interface PromisePreviewData {
  id: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  eventTypeName: string | null;
  interestedDates: string[] | null;
  acquisitionChannelName: string | null;
  socialNetworkName: string | null;
  referrerName: string | null;
}

interface PromisePreviewSectionProps {
  promise: PromisePreviewData;
  studioSlug: string;
}

/**
 * PromisePreviewSection - Vista de preview de promesa para compartir
 * Mobile-first, responsiva, optimizada para visualización en móviles
 */
export function PromisePreviewSection({ promise, studioSlug }: PromisePreviewSectionProps) {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header con logo/identidad del estudio */}
      <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
              <User className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Promesa de Evento</h1>
              <p className="text-xs text-zinc-400">Vista previa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal con scroll */}
      <div className="px-4 py-6 space-y-6 pb-20">
        {/* Placeholder - Próximamente */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
          <div className="mb-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-600/20 flex items-center justify-center">
              <Share2 className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Próximamente
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Estamos trabajando en la visualización completa de tu promesa de evento.
          </p>
          
          {/* Información básica de la promesa */}
          <div className="mt-6 pt-6 border-t border-zinc-800 space-y-4">
            <div className="text-left space-y-3">
              {/* Nombre del contacto */}
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 mb-1">Contacto</p>
                  <p className="text-sm font-medium text-white">{promise.contactName}</p>
                </div>
              </div>

              {/* Teléfono */}
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 mb-1">Teléfono</p>
                  <p className="text-sm font-medium text-white">{promise.contactPhone}</p>
                </div>
              </div>

              {/* Email */}
              {promise.contactEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500 mb-1">Email</p>
                    <p className="text-sm font-medium text-white break-all">{promise.contactEmail}</p>
                  </div>
                </div>
              )}

              {/* Tipo de evento */}
              {promise.eventTypeName && (
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500 mb-1">Tipo de Evento</p>
                    <p className="text-sm font-medium text-white">{promise.eventTypeName}</p>
                  </div>
                </div>
              )}

              {/* Fechas de interés */}
              {promise.interestedDates && promise.interestedDates.length > 0 && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500 mb-2">Fechas de Interés</p>
                    <div className="flex flex-wrap gap-2">
                      {promise.interestedDates.map((date, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 text-emerald-300 border border-emerald-600/30"
                        >
                          {formatDate(new Date(date))}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Canal de adquisición */}
              {promise.acquisitionChannelName && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500 mb-1">Canal de Adquisición</p>
                    <p className="text-sm font-medium text-white">{promise.acquisitionChannelName}</p>
                    {promise.socialNetworkName && (
                      <p className="text-xs text-zinc-400 mt-1">{promise.socialNetworkName}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Referido por */}
              {promise.referrerName && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500 mb-1">Referido por</p>
                    <p className="text-sm font-medium text-white">{promise.referrerName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

