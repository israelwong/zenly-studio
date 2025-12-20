'use client';

import React, { useState } from 'react';
import { Scale } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import type { PublicCotizacion, PublicPaquete } from '@/types/public-promise';
import { ComparadorSheet } from './ComparadorSheet';
import { CotizacionDetailSheet } from './CotizacionDetailSheet';
import { PaqueteDetailSheet } from './PaqueteDetailSheet';

interface ComparadorButtonProps {
  cotizaciones: PublicCotizacion[];
  paquetes: PublicPaquete[];
  promiseId: string;
  studioSlug: string;
}

export function ComparadorButton({ cotizaciones, paquetes, promiseId, studioSlug }: ComparadorButtonProps) {
  const [showComparador, setShowComparador] = useState(false);
  const [selectedCotizacion, setSelectedCotizacion] = useState<PublicCotizacion | null>(null);
  const [selectedPaquete, setSelectedPaquete] = useState<PublicPaquete | null>(null);

  const totalOpciones = cotizaciones.length + paquetes.length;

  if (totalOpciones < 2) {
    return null;
  }

  return (
    <>
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-6 border border-purple-500/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h3 className="text-lg font-semibold text-white mb-1">
                  ¿No sabes cuál elegir?
                </h3>
                <p className="text-sm text-zinc-300">
                  Compara las {totalOpciones} opciones disponibles lado a lado
                </p>
              </div>
              <ZenButton
                size="lg"
                onClick={() => setShowComparador(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Scale className="h-5 w-5 mr-2" />
                Comparar Opciones
              </ZenButton>
            </div>
          </div>
        </div>
      </div>

      {showComparador && (
        <ComparadorSheet
          cotizaciones={cotizaciones}
          paquetes={paquetes}
          isOpen={showComparador}
          onClose={() => setShowComparador(false)}
          onViewDetails={(item, type) => {
            setShowComparador(false);
            if (type === 'cotizacion') {
              setSelectedCotizacion(item as PublicCotizacion);
            } else {
              setSelectedPaquete(item as PublicPaquete);
            }
          }}
        />
      )}

      {/* Sheets de detalle */}
      {selectedCotizacion && (
        <CotizacionDetailSheet
          cotizacion={selectedCotizacion}
          isOpen={!!selectedCotizacion}
          onClose={() => setSelectedCotizacion(null)}
          promiseId={promiseId}
          studioSlug={studioSlug}
        />
      )}

      {selectedPaquete && (
        <PaqueteDetailSheet
          paquete={selectedPaquete}
          isOpen={!!selectedPaquete}
          onClose={() => setSelectedPaquete(null)}
          promiseId={promiseId}
          studioSlug={studioSlug}
        />
      )}
    </>
  );
}

