'use client';

import React, { createContext, useContext } from 'react';

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

interface PromiseContextValue {
  promiseData: PromiseContextData | null;
  isLoading: boolean;
}

const PromiseContext = createContext<PromiseContextValue>({
  promiseData: null,
  isLoading: true,
});

export function PromiseProvider({
  children,
  promiseData,
  isLoading,
}: {
  children: React.ReactNode;
  promiseData: PromiseContextData | null;
  isLoading: boolean;
}) {
  return (
    <PromiseContext.Provider value={{ promiseData, isLoading }}>
      {children}
    </PromiseContext.Provider>
  );
}

export function usePromiseContext() {
  return useContext(PromiseContext);
}
