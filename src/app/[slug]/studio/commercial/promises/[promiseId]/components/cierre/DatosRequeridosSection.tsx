'use client';

import React, { memo, useMemo } from 'react';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface DatosRequeridosSectionProps {
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
  onEditarClick: () => void;
}

export const DatosRequeridosSection = memo(function DatosRequeridosSection({
  promiseData,
  onEditarClick,
}: DatosRequeridosSectionProps) {
  // Calcular completitud de datos dentro del componente
  const clientCompletion = useMemo(() => ({
    name: !!promiseData.name,
    phone: !!promiseData.phone,
    email: !!promiseData.email,
    address: !!promiseData.address,
    event_name: !!promiseData.event_name,
    event_location: !!promiseData.event_location,
    event_date: !!promiseData.event_date,
  }), [promiseData]);

  const completedFields = useMemo(() => 
    Object.values(clientCompletion).filter(Boolean).length,
    [clientCompletion]
  );

  const totalFields = 7;
  const clientPercentage = Math.round((completedFields / totalFields) * 100);

  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
      <div className="flex items-start gap-2 mb-2">
        {clientPercentage === 100 ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">
              Datos Requeridos {completedFields}/{totalFields}
            </span>
            <button
              onClick={onEditarClick}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Editar
            </button>
          </div>
        </div>
      </div>
      <div className="border-t border-zinc-700/50 pt-2">
        <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs">
          <div className="flex items-center gap-1">
            {clientCompletion.name ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 text-zinc-600 shrink-0" />
            )}
            <span className={clientCompletion.name ? 'text-zinc-400' : 'text-zinc-500'}>Nombre</span>
          </div>
          <div className="flex items-center gap-1">
            {clientCompletion.phone ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 text-zinc-600 shrink-0" />
            )}
            <span className={clientCompletion.phone ? 'text-zinc-400' : 'text-zinc-500'}>Teléfono</span>
          </div>
          <div className="flex items-center gap-1">
            {clientCompletion.email ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 text-zinc-600 shrink-0" />
            )}
            <span className={clientCompletion.email ? 'text-zinc-400' : 'text-zinc-500'}>Correo</span>
          </div>
          <div className="flex items-center gap-1">
            {clientCompletion.address ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 text-zinc-600 shrink-0" />
            )}
            <span className={clientCompletion.address ? 'text-zinc-400' : 'text-zinc-500'}>Dirección</span>
          </div>
          <div className="flex items-center gap-1">
            {clientCompletion.event_name ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 text-zinc-600 shrink-0" />
            )}
            <span className={clientCompletion.event_name ? 'text-zinc-400' : 'text-zinc-500'}>Evento</span>
          </div>
          <div className="flex items-center gap-1">
            {clientCompletion.event_location ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 text-zinc-600 shrink-0" />
            )}
            <span className={clientCompletion.event_location ? 'text-zinc-400' : 'text-zinc-500'}>Locación</span>
          </div>
          <div className="flex items-center gap-1">
            {clientCompletion.event_date ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 text-zinc-600 shrink-0" />
            )}
            <span className={clientCompletion.event_date ? 'text-zinc-400' : 'text-zinc-500'}>Fecha</span>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si cambian los datos de la promesa
  return (
    prevProps.promiseData.name === nextProps.promiseData.name &&
    prevProps.promiseData.phone === nextProps.promiseData.phone &&
    prevProps.promiseData.email === nextProps.promiseData.email &&
    prevProps.promiseData.address === nextProps.promiseData.address &&
    prevProps.promiseData.event_name === nextProps.promiseData.event_name &&
    prevProps.promiseData.event_location === nextProps.promiseData.event_location &&
    prevProps.promiseData.event_date?.getTime() === nextProps.promiseData.event_date?.getTime()
  );
});

