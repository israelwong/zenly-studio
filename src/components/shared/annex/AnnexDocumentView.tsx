'use client';

import React from 'react';
import { renderCondicionesComercialesBlock } from '@/components/shared/contracts/utils/contract-renderer';
import type { CotizacionRenderData, CondicionesComercialesData } from '@/components/shared/contracts/types';
import { formatItemQuantity } from '@/lib/utils/contract-item-formatter';

export interface AnnexDeliveryPolicy {
  /** false = Incluido en plazo global; true = Independiente con días propios */
  independent: boolean;
  /** Días requeridos cuando entrega independiente */
  dias?: number | null;
  /** 'before' | 'after' respecto a la entrega global del contrato principal */
  timing?: 'before' | 'after' | string | null;
}

export interface AnnexDocumentViewProps {
  /** Referencia al contrato maestro (ID) */
  masterContractId: string | null;
  /** Fecha del contrato maestro (formato legible) */
  masterContractDate: string | null;
  /** Ítems adicionales del anexo (secciones/categorías/ítems) */
  cotizacionData: CotizacionRenderData | null;
  /** Desglose financiero del anexo */
  condicionesData: CondicionesComercialesData | null;
  /** Políticas de entrega: Incluido vs Independiente + días/timing */
  deliveryPolicy?: AnnexDeliveryPolicy | null;
  /** Clase adicional para el contenedor */
  className?: string;
}

export function AnnexDocumentView({
  masterContractId,
  masterContractDate,
  cotizacionData,
  condicionesData,
  deliveryPolicy,
  className = '',
}: AnnexDocumentViewProps) {
  const condicionesHtml = condicionesData
    ? renderCondicionesComercialesBlock(condicionesData, { isForPdf: false, compact: true })
    : '';

  return (
    <div className={`annex-document space-y-6 text-zinc-200 ${className}`}>
      {/* Cabecera: título + referencia al Contrato Maestro (sin card) */}
      <header>
        <h2 className="text-2xl font-semibold text-zinc-200 mb-2">
          Anexo al Contrato Maestro
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-400">
          {masterContractId && (
            <span>
              <span className="text-zinc-500">ID Contrato:</span>{' '}
              <span className="font-mono text-zinc-300">{masterContractId}</span>
            </span>
          )}
          {masterContractDate && (
            <span>
              <span className="text-zinc-500">Fecha:</span>{' '}
              <span className="text-zinc-300">{masterContractDate}</span>
            </span>
          )}
        </div>
      </header>

      {/* Ítems adicionales: estructura anidada sección → categoría → ítems (como cotizaciones) */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Servicios adicionales
        </h3>
        {cotizacionData?.secciones && cotizacionData.secciones.length > 0 ? (
          <div className="space-y-4">
            {[...cotizacionData.secciones]
              .sort((a, b) => a.orden - b.orden)
              .map((seccion) => (
                <div
                  key={seccion.nombre}
                  className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-900/30"
                >
                  <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
                    <h4 className="text-base font-semibold text-zinc-200">{seccion.nombre}</h4>
                  </div>
                  <div className="p-2 space-y-2">
                    {[...seccion.categorias]
                      .sort((a, b) => a.orden - b.orden)
                      .map((categoria) => (
                        <div
                          key={`${seccion.nombre}-${categoria.nombre}`}
                          className="rounded-md border border-zinc-800 overflow-hidden bg-zinc-900/30"
                        >
                          <div className="px-3 py-2 border-b border-zinc-800/80 bg-zinc-800/20">
                            <h5 className="text-sm font-medium text-zinc-300">{categoria.nombre}</h5>
                          </div>
                          <ul className="px-3 py-2 space-y-1.5 text-sm">
                            {categoria.items.map((item) => {
                              const formatted = formatItemQuantity({
                                quantity: item.cantidad ?? 1,
                                billingType: item.billing_type ?? 'SERVICE',
                                eventDurationHours: item.horas ?? null,
                                cantidadEfectiva: item.cantidadEfectiva,
                              });
                              return (
                                <li
                                  key={item.nombre}
                                  className="flex flex-wrap items-baseline gap-x-2 text-zinc-400"
                                >
                                  <span className="font-medium text-zinc-300">{item.nombre}</span>
                                  {formatted.displayText && (
                                    <span className="text-zinc-500">{formatted.displayText}</span>
                                  )}
                                  {item.is_courtesy && (
                                    <span className="text-zinc-500 italic">— $0.00 (Cortesía / Beneficio)</span>
                                  )}
                                  {item.descripcion && (
                                    <span className="w-full text-zinc-500 text-xs mt-0.5 ml-0">{item.descripcion}</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-zinc-500 italic text-sm">No hay ítems en este anexo.</p>
        )}
      </section>

      {/* Desglose financiero */}
      {condicionesData && (
        <section>
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
            Desglose financiero
          </h3>
          <div
            className="annex-condiciones [&_.condiciones-comerciales]:!p-4 [&_.condiciones-comerciales]:!bg-zinc-900/50 [&_.condiciones-comerciales]:!border-zinc-700"
            dangerouslySetInnerHTML={{ __html: condicionesHtml }}
          />
        </section>
      )}

      {/* Políticas de Entrega (Independiente / Incluido) — sin card */}
      {deliveryPolicy != null && (
        <section>
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-1">
            Políticas de entrega
          </h3>
          {deliveryPolicy.independent ? (
            <div className="space-y-1 text-sm text-zinc-300">
              <p className="font-medium text-emerald-200/90">Entrega independiente</p>
              {deliveryPolicy.dias != null && deliveryPolicy.dias > 0 && (
                <p className="text-zinc-400">
                  Plazo: {deliveryPolicy.dias} día{deliveryPolicy.dias !== 1 ? 's' : ''} desde la fecha acordada.
                </p>
              )}
              {deliveryPolicy.timing === 'before' && (
                <p className="text-zinc-400">Respecto a la entrega global: antes.</p>
              )}
              {deliveryPolicy.timing === 'after' && (
                <p className="text-zinc-400">Respecto a la entrega global: después.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              Tiempo de entrega incluido, definido en las políticas de entrega.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
