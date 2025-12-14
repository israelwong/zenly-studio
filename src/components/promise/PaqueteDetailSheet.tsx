'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Clock, Send, Edit } from 'lucide-react';
import { ZenButton, SeparadorZen } from '@/components/ui/zen';
import type { PublicPaquete } from '@/types/public-promise';
import { PublicServiciosTree } from './PublicServiciosTree';
import { SolicitarPaqueteModal } from './SolicitarPaqueteModal';
import { SolicitarPersonalizacionModal } from './SolicitarPersonalizacionModal';
import { obtenerCondicionesComercialesPublicas, obtenerTerminosCondicionesPublicos } from '@/lib/actions/public/promesas.actions';

interface CondicionComercial {
  id: string;
  name: string;
  description: string | null;
  advance_percentage: number | null;
  discount_percentage: number | null;
  metodos_pago: Array<{
    id: string;
    metodo_pago_id: string;
    metodo_pago_name: string;
  }>;
}

interface TerminoCondicion {
  id: string;
  title: string;
  content: string;
  is_required: boolean;
}

interface PaqueteDetailSheetProps {
  paquete: PublicPaquete;
  isOpen: boolean;
  onClose: () => void;
  promiseId: string;
  studioSlug: string;
  condicionesComerciales?: CondicionComercial[];
  terminosCondiciones?: TerminoCondicion[];
}

export function PaqueteDetailSheet({
  paquete,
  isOpen,
  onClose,
  promiseId,
  studioSlug,
  condicionesComerciales: condicionesComercialesIniciales,
  terminosCondiciones: terminosCondicionesIniciales,
}: PaqueteDetailSheetProps) {
  const [showSolicitarModal, setShowSolicitarModal] = useState(false);
  const [showPersonalizacionModal, setShowPersonalizacionModal] = useState(false);
  const [condicionesComerciales, setCondicionesComerciales] = useState<CondicionComercial[]>([]);
  const [terminosCondiciones, setTerminosCondiciones] = useState<TerminoCondicion[]>([]);
  const [selectedCondicionId, setSelectedCondicionId] = useState<string | null>(null);
  const [selectedMetodoPagoId, setSelectedMetodoPagoId] = useState<string | null>(null);
  const [loadingCondiciones, setLoadingCondiciones] = useState(true);

  const loadCondicionesYTerminos = useCallback(async () => {
    setLoadingCondiciones(true);
    try {
      const [condicionesResult, terminosResult] = await Promise.all([
        obtenerCondicionesComercialesPublicas(studioSlug),
        obtenerTerminosCondicionesPublicos(studioSlug),
      ]);

      if (condicionesResult.success && condicionesResult.data) {
        setCondicionesComerciales(condicionesResult.data);
      }

      if (terminosResult.success && terminosResult.data) {
        setTerminosCondiciones(terminosResult.data);
      }
    } catch (error) {
      console.error('[PaqueteDetailSheet] Error al cargar condiciones y términos:', error);
    } finally {
      setLoadingCondiciones(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    if (isOpen) {
      // Si ya tenemos los datos iniciales, usarlos directamente
      if (condicionesComercialesIniciales || terminosCondicionesIniciales) {
        if (condicionesComercialesIniciales) {
          setCondicionesComerciales(condicionesComercialesIniciales);
        }
        if (terminosCondicionesIniciales) {
          setTerminosCondiciones(terminosCondicionesIniciales);
        }
        setLoadingCondiciones(false);
      } else {
        // Si no, cargarlos
        loadCondicionesYTerminos();
      }
    }
  }, [isOpen, studioSlug, condicionesComercialesIniciales, terminosCondicionesIniciales, loadCondicionesYTerminos]);

  const handleSelectCondicion = (condicionId: string, metodoPagoId: string) => {
    setSelectedCondicionId(condicionId);
    // Si el metodoPagoId es igual al condicionId, significa que no hay método de pago específico
    setSelectedMetodoPagoId(metodoPagoId === condicionId ? null : metodoPagoId);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed top-0 right-0 h-full w-full sm:max-w-md md:max-w-lg bg-zinc-900 border-l border-zinc-800 z-50 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 truncate">
                {paquete.name}
              </h2>
              {paquete.description && (
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 line-clamp-2">
                  {paquete.description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Precio principal */}
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
            <div className="flex items-end justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-400 mb-2">Precio del Paquete</p>
                <p className="text-4xl font-bold text-blue-400">
                  {formatPrice(paquete.price)}
                </p>
              </div>

              {paquete.tiempo_minimo_contratacion && (
                <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20 shrink-0">
                  <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-400">Requiere</p>
                    <p className="text-sm font-medium text-amber-300 truncate">
                      {paquete.tiempo_minimo_contratacion} días
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <SeparadorZen />

          {/* Servicios incluidos */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Servicios Incluidos
            </h3>
            <PublicServiciosTree servicios={paquete.servicios} showPrices={false} />
          </div>

          {/* Información importante */}
          {paquete.tiempo_minimo_contratacion && (
            <>
              <SeparadorZen />
              <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                <h4 className="font-semibold text-amber-300 mb-2">
                  ⏰ Tiempo mínimo de contratación
                </h4>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Este paquete requiere al menos {paquete.tiempo_minimo_contratacion} días
                  de anticipación para garantizar la disponibilidad y preparación de todos
                  los servicios incluidos.
                </p>
              </div>
            </>
          )}

          {/* Condiciones comerciales */}
          <SeparadorZen />
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Condiciones Comerciales
            </h3>
            {loadingCondiciones ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 border border-zinc-700 rounded-lg bg-zinc-800/30 animate-pulse">
                    <div className="h-4 w-32 bg-zinc-700 rounded mb-2" />
                    <div className="h-3 w-full bg-zinc-700 rounded" />
                  </div>
                ))}
              </div>
            ) : condicionesComerciales.length === 0 ? (
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                <p className="text-sm text-zinc-400">No hay condiciones comerciales disponibles</p>
              </div>
            ) : (
              <div className="space-y-2">
                {condicionesComerciales.map((condicion) => {
                  // Si no tiene métodos de pago, mostrar la condición sin método específico
                  if (condicion.metodos_pago.length === 0) {
                    const isSelected = selectedCondicionId === condicion.id && !selectedMetodoPagoId;
                    return (
                      <div
                        key={condicion.id}
                        onClick={() => handleSelectCondicion(condicion.id, condicion.id)}
                        className={`
                          border rounded-lg p-3 cursor-pointer transition-all
                          ${isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                            : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          {/* Radio Button */}
                          <div className="mt-0.5 shrink-0">
                            <div
                              className={`
                                w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                                ${isSelected
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : 'border-zinc-600'
                                }
                              `}
                            >
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                                {condicion.name}
                              </span>
                            </div>

                            {condicion.description && (
                              <p className={`text-xs mt-1 ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                {condicion.description}
                              </p>
                            )}

                            <div className={`flex items-center gap-3 text-xs mt-1.5 ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}>
                              {condicion.advance_percentage !== null && (
                                <span>Anticipo: {condicion.advance_percentage}%</span>
                              )}
                              <span>Descuento: {condicion.discount_percentage ?? 0}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Si tiene métodos de pago, mostrar uno por cada método
                  return (
                    <div key={condicion.id} className="space-y-2">
                      {condicion.metodos_pago.map((metodo) => {
                        const isSelected = selectedCondicionId === condicion.id && selectedMetodoPagoId === metodo.id;
                        return (
                          <div
                            key={metodo.id}
                            onClick={() => handleSelectCondicion(condicion.id, metodo.id)}
                            className={`
                              border rounded-lg p-3 cursor-pointer transition-all
                              ${isSelected
                                ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                                : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
                              }
                            `}
                          >
                            <div className="flex items-start gap-3">
                              {/* Radio Button */}
                              <div className="mt-0.5 shrink-0">
                                <div
                                  className={`
                                    w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                                    ${isSelected
                                      ? 'border-emerald-500 bg-emerald-500'
                                      : 'border-zinc-600'
                                    }
                                  `}
                                >
                                  {isSelected && (
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                  )}
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                                    {condicion.name}
                                  </span>
                                </div>

                                {condicion.description && (
                                  <p className={`text-xs mt-1 ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                    {condicion.description}
                                  </p>
                                )}

                                <div className={`flex items-center gap-3 text-xs mt-1.5 ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}>
                                  {condicion.advance_percentage !== null && (
                                    <span>Anticipo: {condicion.advance_percentage}%</span>
                                  )}
                                  <span>Descuento: {condicion.discount_percentage ?? 0}%</span>
                                  <span className="text-emerald-400">Método: {metodo.metodo_pago_name}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Términos y condiciones */}
            {terminosCondiciones.length > 0 && (
              <div className="mt-4 space-y-2">
                {terminosCondiciones.map((termino) => (
                  <div key={termino.id} className="text-xs text-zinc-500">
                    <p className="font-medium mb-1">{termino.title}</p>
                    <div
                      dangerouslySetInnerHTML={{ __html: termino.content }}
                      className="prose prose-xs prose-invert max-w-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 px-4 sm:px-6 py-3">
          <div className="flex gap-2">
            <ZenButton
              variant="ghost"
              onClick={() => setShowPersonalizacionModal(true)}
              className="shrink-0"
              size="sm"
            >
              <Edit className="h-4 w-4 mr-1.5" />
              Personalizar
            </ZenButton>
            <ZenButton
              onClick={() => setShowSolicitarModal(true)}
              className="flex-1"
              size="sm"
              disabled={!selectedCondicionId}
            >
              <Send className="h-4 w-4 mr-1.5" />
              Solicitar
            </ZenButton>
          </div>
        </div>
      </div>

      {/* Modal de solicitud de contratación */}
      {showSolicitarModal && (
        <SolicitarPaqueteModal
          paquete={paquete}
          isOpen={showSolicitarModal}
          onClose={() => setShowSolicitarModal(false)}
          promiseId={promiseId}
          studioSlug={studioSlug}
          condicionesComercialesId={selectedCondicionId}
          condicionesComercialesMetodoPagoId={selectedMetodoPagoId}
        />
      )}

      {/* Modal de personalización */}
      {showPersonalizacionModal && (
        <SolicitarPersonalizacionModal
          itemName={paquete.name}
          itemType="paquete"
          itemId={paquete.id}
          isOpen={showPersonalizacionModal}
          onClose={() => setShowPersonalizacionModal(false)}
          promiseId={promiseId}
          studioSlug={studioSlug}
        />
      )}
    </>
  );
}

