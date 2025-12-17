'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Clock, Send, Edit } from 'lucide-react';
import { ZenButton, SeparadorZen } from '@/components/ui/zen';
import type { PublicPaquete } from '@/types/public-promise';
import { PublicServiciosTree } from './PublicServiciosTree';
import { SolicitarPaqueteModal } from './SolicitarPaqueteModal';
import { SolicitarPersonalizacionModal } from './SolicitarPersonalizacionModal';
import { CondicionesComercialesSelector } from './shared/CondicionesComercialesSelector';
import { PrecioDesglose } from './shared/PrecioDesglose';
import { TerminosCondiciones } from './shared/TerminosCondiciones';
import { obtenerCondicionesComercialesPublicas, obtenerTerminosCondicionesPublicos, filtrarCondicionesPorPreferencias } from '@/lib/actions/public/promesas.actions';
import { formatCurrency } from '@/lib/actions/utils/formatting';

interface CondicionComercial {
  id: string;
  name: string;
  description: string | null;
  advance_percentage: number | null;
  advance_type?: string | null;
  advance_amount?: number | null;
  discount_percentage: number | null;
  type?: string;
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
  showCategoriesSubtotals?: boolean;
  showItemsPrices?: boolean;
  minDaysToHire?: number;
  showStandardConditions?: boolean;
  showOfferConditions?: boolean;
}

export function PaqueteDetailSheet({
  paquete,
  isOpen,
  onClose,
  promiseId,
  studioSlug,
  condicionesComerciales: condicionesComercialesIniciales,
  terminosCondiciones: terminosCondicionesIniciales,
  showCategoriesSubtotals = false,
  showItemsPrices = false,
  minDaysToHire,
  showStandardConditions = true,
  showOfferConditions = false,
}: PaqueteDetailSheetProps) {
  const [showSolicitarModal, setShowSolicitarModal] = useState(false);
  const [showPersonalizacionModal, setShowPersonalizacionModal] = useState(false);
  const [condicionesComerciales, setCondicionesComerciales] = useState<CondicionComercial[]>([]);
  const [terminosCondiciones, setTerminosCondiciones] = useState<TerminoCondicion[]>([]);
  const [selectedCondicionId, setSelectedCondicionId] = useState<string | null>(null);
  const [selectedMetodoPagoId, setSelectedMetodoPagoId] = useState<string | null>(null);
  const [loadingCondiciones, setLoadingCondiciones] = useState(true);
  const precioDesgloseRef = useRef<HTMLDivElement>(null);

  const loadCondicionesYTerminos = useCallback(async () => {
    setLoadingCondiciones(true);
    try {
      const [condicionesResult, terminosResult] = await Promise.all([
        obtenerCondicionesComercialesPublicas(studioSlug),
        obtenerTerminosCondicionesPublicos(studioSlug),
      ]);

      if (condicionesResult.success && condicionesResult.data) {
        // Filtrar condiciones según preferencias
        const condicionesFiltradas = await filtrarCondicionesPorPreferencias(
          studioSlug,
          condicionesResult.data,
          showStandardConditions,
          showOfferConditions
        );
        setCondicionesComerciales(condicionesFiltradas);
      }

      if (terminosResult.success && terminosResult.data) {
        setTerminosCondiciones(terminosResult.data);
      }
    } catch (error) {
      console.error('[PaqueteDetailSheet] Error al cargar condiciones y términos:', error);
    } finally {
      setLoadingCondiciones(false);
    }
  }, [studioSlug, showStandardConditions, showOfferConditions]);

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


  // Calcular precio según condición comercial seleccionada
  const calculatePriceWithCondition = () => {
    if (!selectedCondicionId) return null;

    const condicion = condicionesComerciales.find(c => c.id === selectedCondicionId);
    if (!condicion) return null;

    // Precio base del paquete
    const precioBase = paquete.price;

    // Aplicar descuento de la condición comercial
    const descuentoCondicion = condicion.discount_percentage ?? 0;
    const precioConDescuento = descuentoCondicion > 0
      ? precioBase - (precioBase * descuentoCondicion) / 100
      : precioBase;

    // Calcular anticipo según tipo
    const advanceType = condicion.advance_type || 'percentage';
    const anticipo = advanceType === 'fixed_amount' && condicion.advance_amount
      ? condicion.advance_amount
      : (condicion.advance_percentage ?? 0) > 0
        ? (precioConDescuento * (condicion.advance_percentage ?? 0)) / 100
        : 0;
    const anticipoPorcentaje = advanceType === 'percentage' ? (condicion.advance_percentage ?? 0) : null;
    const anticipoMontoFijo = advanceType === 'fixed_amount' ? condicion.advance_amount : null;

    // Calcular diferido
    const diferido = precioConDescuento - anticipo;

    return {
      precioBase,
      descuentoCondicion,
      precioConDescuento,
      advanceType,
      anticipoPorcentaje,
      anticipoMontoFijo,
      anticipo,
      diferido,
    };
  };

  const precioCalculado = calculatePriceWithCondition();

  // Scroll automático al desglose cuando se selecciona una condición comercial
  useEffect(() => {
    if (precioCalculado && precioDesgloseRef.current) {
      setTimeout(() => {
        precioDesgloseRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 100);
    }
  }, [precioCalculado]);

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

            </div>
          </div>

          <SeparadorZen />

          {/* Servicios incluidos */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Servicios Incluidos
            </h3>
            <PublicServiciosTree
              servicios={paquete.servicios}
              showPrices={false}
              showSubtotals={false}
            />
          </div>


          {/* Condiciones comerciales */}
          <SeparadorZen />
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Condiciones Comerciales
            </h3>
            <CondicionesComercialesSelector
              condiciones={condicionesComerciales}
              selectedCondicionId={selectedCondicionId}
              selectedMetodoPagoId={selectedMetodoPagoId}
              onSelectCondicion={handleSelectCondicion}
              loading={loadingCondiciones}
            />

            {/* Cálculo de precio según condición comercial */}
            {precioCalculado && (
              <PrecioDesglose
                ref={precioDesgloseRef}
                precioBase={precioCalculado.precioBase}
                descuentoCondicion={precioCalculado.descuentoCondicion}
                precioConDescuento={precioCalculado.precioConDescuento}
                advanceType={precioCalculado.advanceType}
                anticipoPorcentaje={precioCalculado.anticipoPorcentaje}
                anticipo={precioCalculado.anticipo}
                diferido={precioCalculado.diferido}
              />
            )}

            {/* Términos y condiciones */}
            <TerminosCondiciones terminos={terminosCondiciones} />
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

