'use client';

import React, { createContext, useContext } from 'react';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';

export interface PromiseContextData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  event_type_id: string | null;
  event_type_name: string | null;
  event_location: string | null;
  event_name: string | null;
  duration_hours: number | null;
  event_date: Date | null;
  interested_dates: string[] | null;
  acquisition_channel_id?: string | null;
  acquisition_channel_name?: string | null;
  social_network_id?: string | null;
  social_network_name?: string | null;
  referrer_contact_id?: string | null;
  referrer_name?: string | null;
  referrer_contact_name?: string | null;
  referrer_contact_email?: string | null;
  contact_id: string;
  evento_id: string | null;
  promise_id: string;
}

export type PromiseStateSegment = 'pendiente' | 'cierre' | 'autorizada';

interface PromiseContextValue {
  promiseData: PromiseContextData | null;
  isLoading: boolean;
  /** Estado de la promesa (del layout) para redirigir desde /cierre si no aplica */
  promiseState: PromiseStateSegment | null;
  /** Cotización en cierre o aprobada sin evento (del layout, evita doble fetch en /cierre) */
  cotizacionEnCierre: CotizacionListItem | null;
}

const PromiseContext = createContext<PromiseContextValue>({
  promiseData: null,
  isLoading: true,
  promiseState: null,
  cotizacionEnCierre: null,
});

export function PromiseProvider({
  children,
  promiseData,
  isLoading,
  promiseState = null,
  cotizacionEnCierre = null,
}: {
  children: React.ReactNode;
  promiseData: PromiseContextData | null;
  isLoading: boolean;
  promiseState?: PromiseStateSegment | null;
  cotizacionEnCierre?: CotizacionListItem | null;
}) {
  return (
    <PromiseContext.Provider value={{ promiseData, isLoading, promiseState, cotizacionEnCierre }}>
      {children}
    </PromiseContext.Provider>
  );
}

export function usePromiseContext() {
  return useContext(PromiseContext);
}
