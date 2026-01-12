'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
import { FileText, HelpCircle } from 'lucide-react';
import { PromiseClosingProcessCard } from './PromiseClosingProcessCard';
import { CotizacionAutorizadaCard } from './CotizacionAutorizadaCard';
import { getCotizacionesByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { ClosingProcessInfoModal } from './ClosingProcessInfoModal';

interface PromiseClosingProcessSectionProps {
  studioSlug: string;
  promiseId: string | null;
  promiseData: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    event_date: Date | null;
    event_name: string | null;
    event_type_name: string | null;
    event_location?: string | null;
  };
  onAuthorizeClick: () => void;
  contactId?: string;
  eventTypeId?: string | null;
  acquisitionChannelId?: string | null;
}

export function PromiseClosingProcessSection({
  studioSlug,
  promiseId,
  promiseData,
  onAuthorizeClick,
  contactId,
  eventTypeId,
  acquisitionChannelId,
}: PromiseClosingProcessSectionProps) {
  const [cotizaciones, setCotizaciones] = useState<CotizacionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const loadCotizaciones = React.useCallback(async () => {
    if (!promiseId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await getCotizacionesByPromiseId(promiseId);
      if (result.success && result.data) {
        setCotizaciones(result.data);
      }
    } catch (error) {
      console.error('[PromiseClosingProcessSection] Error loading cotizaciones:', error);
    } finally {
      setLoading(false);
    }
  }, [promiseId]);

  // Cargar cotizaciones iniciales
  useEffect(() => {
    loadCotizaciones();
  }, [loadCotizaciones]);

  // Suscribirse a cambios en tiempo real
  useCotizacionesRealtime({
    studioSlug,
    promiseId: promiseId || null,
    ignoreCierreEvents: true, // Ignorar eventos de cierre (contrato, pago, condiciones)
    onCotizacionInserted: () => {
      loadCotizaciones();
    },
    onCotizacionUpdated: (cotizacionId: string, payload?: unknown) => {
      const p = payload as any;

      // Verificar si cambió el estado (importante para mostrar/ocultar el card de cierre)
      const changeInfo = p?.changeInfo;
      const newRecord = p?.newRecord || p?.new;

      // Estados de cierre y relacionados
      const estadosCierre = ['en_cierre', 'contract_pending', 'contract_generated', 'contract_signed', 'aprobada', 'approved', 'autorizada'];

      // Si cambió el estado, recargar SIEMPRE (importante para detectar cuando prospecto autoriza)
      if (changeInfo?.statusChanged) {
        const oldStatus = changeInfo.oldStatus;
        const newStatus = changeInfo.newStatus;

        // Recargar si cambió a un estado de cierre o desde un estado de cierre
        const pasoACierre = estadosCierre.includes(newStatus);
        const salioDeCierre = estadosCierre.includes(oldStatus);

        // Recargar siempre que cambie el estado (para asegurar que se muestre/oculte el card correcto)
        if (pasoACierre || salioDeCierre || oldStatus !== newStatus) {
          loadCotizaciones();
          return;
        }
      }

      // CRÍTICO: Si cambió evento_id y el nuevo status es 'autorizada', recargar inmediatamente
      // Esto asegura que se muestre CotizacionAutorizadaCard cuando se crea el evento
      if (changeInfo?.camposCambiados?.includes('evento_id')) {
        if (newRecord?.status === 'autorizada' && newRecord?.evento_id) {
          loadCotizaciones();
          return;
        }
      }

      // También recargar si hay otros campos importantes cambiados
      if (changeInfo?.camposCambiados?.length) {
        // Verificar que NO sea solo updated_at
        const camposImportantes = changeInfo.camposCambiados.filter(
          (campo: string) => campo !== 'updated_at'
        );
        if (camposImportantes.length > 0) {
          loadCotizaciones();
        }
      }
    },
    onCotizacionDeleted: () => {
      loadCotizaciones();
    },
  });

  // ============================================
  // VALIDACIONES: Determinar qué card mostrar
  // ============================================

  // 1. Validar si hay cotización autorizada con evento creado
  const cotizacionAutorizada = cotizaciones.find(
    (c) =>
      c.status === 'autorizada' &&
      !!c.evento_id // Debe tener evento_id asignado
  );
  const tieneCotizacionAutorizada = !!cotizacionAutorizada && !!promiseId && !!cotizacionAutorizada.evento_id;

  // 2. Validar si hay cotización en proceso de cierre (solo 'en_cierre', no 'aprobada' o 'approved')
  const cotizacionEnCierre = cotizaciones.find(
    (c) => c.status === 'en_cierre'
  );
  const tieneCotizacionEnCierre = !!cotizacionEnCierre && !!promiseId;

  // 3. Validar si hay cotización aprobada (sin evento aún)
  const cotizacionAprobada = cotizaciones.find(
    (c) =>
      (c.status === 'aprobada' || c.status === 'approved') &&
      !c.evento_id // No debe tener evento_id (aún no autorizada)
  );
  const tieneCotizacionAprobada = !!cotizacionAprobada && !!promiseId;

  // ============================================
  // RENDERIZADO: Mostrar card según validaciones
  // ============================================

  // Estado de carga: mostrar skeleton solo si NO hay cotización autorizada ya detectada
  // Si ya sabemos que hay evento creado, mostrar skeleton genérico sin header "Proceso de Cierre"
  if (loading) {
    // Si ya detectamos cotización autorizada, mostrar skeleton del card autorizado
    if (cotizacionAutorizada && cotizacionAutorizada.evento_id) {
      return (
        <CotizacionAutorizadaCard
          cotizacion={cotizacionAutorizada}
          eventoId={cotizacionAutorizada.evento_id}
          studioSlug={studioSlug}
        />
      );
    }

    // Si hay cotización en cierre, mostrar skeleton con header "Proceso de Cierre"
    if (cotizacionEnCierre) {
      return (
        <>
          <ZenCard className="h-full flex flex-col">
            <ZenCardHeader className="border-b border-zinc-800 py-3 px-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-zinc-600 shrink-0" />
                  <ZenCardTitle className="text-sm">Proceso de Cierre</ZenCardTitle>
                </div>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInfoModal(true)}
                  className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-300"
                >
                  <HelpCircle className="h-4 w-4" />
                </ZenButton>
              </div>
            </ZenCardHeader>
            <ZenCardContent className="p-4 flex-1 overflow-y-auto">
              {/* Skeleton: Header con nombre y botones */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse flex-1" />
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>

              {/* Skeleton: Secciones del proceso */}
              <div className="space-y-2 mb-4">
                {/* Condiciones Comerciales */}
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 bg-zinc-700 rounded shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="h-3 w-40 bg-zinc-700 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-zinc-700 rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Datos Requeridos */}
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="h-4 w-4 bg-zinc-700 rounded shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-36 bg-zinc-700 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-zinc-700 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-zinc-700/50 pt-2">
                    <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className="h-3 w-3 bg-zinc-700 rounded shrink-0 animate-pulse" />
                          <div className="h-3 w-16 bg-zinc-700 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Contrato Digital */}
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 bg-zinc-700 rounded shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="h-3 w-32 bg-zinc-700 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-zinc-700 rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-28 bg-zinc-700 rounded animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Pago Inicial */}
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 bg-zinc-700 rounded shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="h-3 w-28 bg-zinc-700 rounded animate-pulse" />
                        <div className="h-3 w-20 bg-zinc-700 rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Skeleton: Botones de acción */}
              <div className="space-y-2">
                <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
                <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
              </div>
            </ZenCardContent>
          </ZenCard>
          <ClosingProcessInfoModal
            isOpen={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            onConfirm={() => setShowInfoModal(false)}
            showDismissCheckbox={false}
          />
        </>
      );
    }

    // Si no hay cotización autorizada ni en cierre, mostrar skeleton genérico sin header "Proceso de Cierre"
    return (
      <ZenCard className="h-full flex flex-col">
        <ZenCardContent className="p-6 flex-1 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin text-zinc-400">
            <div className="h-6 w-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full" />
          </div>
        </ZenCardContent>
      </ZenCard>
    );
  }

  // Prioridad 1: Mostrar card de cotización autorizada (evento ya creado)
  if (tieneCotizacionAutorizada && cotizacionAutorizada && cotizacionAutorizada.evento_id) {
    return (
      <CotizacionAutorizadaCard
        cotizacion={cotizacionAutorizada}
        eventoId={cotizacionAutorizada.evento_id}
        studioSlug={studioSlug}
      />
    );
  }

  // Prioridad 2: Mostrar card de proceso de cierre (solo si status es 'en_cierre')
  if (tieneCotizacionEnCierre && cotizacionEnCierre && promiseId) {
    return (
      <PromiseClosingProcessCard
        cotizacion={cotizacionEnCierre}
        promiseData={promiseData}
        studioSlug={studioSlug}
        promiseId={promiseId}
        onAuthorizeClick={onAuthorizeClick}
        isLoadingPromiseData={false}
        onCierreCancelado={() => {
          // Recargar cotizaciones inmediatamente cuando se cancela el cierre
          loadCotizaciones();
        }}
        contactId={contactId}
        eventTypeId={eventTypeId}
        acquisitionChannelId={acquisitionChannelId}
      />
    );
  }

  // Prioridad 3: Mostrar card de proceso de cierre para cotizaciones aprobadas (sin evento aún)
  if (tieneCotizacionAprobada && cotizacionAprobada && promiseId) {
    return (
      <PromiseClosingProcessCard
        cotizacion={cotizacionAprobada}
        promiseData={promiseData}
        studioSlug={studioSlug}
        promiseId={promiseId}
        onAuthorizeClick={onAuthorizeClick}
        isLoadingPromiseData={false}
        onCierreCancelado={() => {
          // Recargar cotizaciones inmediatamente cuando se cancela el cierre
          loadCotizaciones();
        }}
        contactId={contactId}
        eventTypeId={eventTypeId}
        acquisitionChannelId={acquisitionChannelId}
      />
    );
  }

  // Prioridad 4: No hay cotización en cierre - mostrar mensaje informativo
  return (
    <>
      <ZenCard className="h-full flex flex-col">
        <ZenCardHeader className="border-b border-zinc-800 py-3 px-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-zinc-600 shrink-0" />
              <ZenCardTitle className="text-sm">Proceso de Cierre</ZenCardTitle>
            </div>
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => setShowInfoModal(true)}
              className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-300"
            >
              <HelpCircle className="h-4 w-4" />
            </ZenButton>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6 flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center text-center">
            <FileText className="h-12 w-12 text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-400">
              No tienes cotización en proceso de cierre
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Selecciona "Pasar a Cierre" en una cotización pendiente para iniciar el proceso
            </p>
          </div>
        </ZenCardContent>
      </ZenCard>
      <ClosingProcessInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        onConfirm={() => setShowInfoModal(false)}
        showDismissCheckbox={false}
      />
    </>
  );
}

