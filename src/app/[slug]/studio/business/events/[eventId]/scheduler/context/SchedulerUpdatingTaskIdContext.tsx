'use client';

import React, { createContext, useContext } from 'react';

const SchedulerUpdatingTaskIdContext = createContext<string | null>(null);

export function SchedulerUpdatingTaskIdProvider({
  updatingTaskId,
  children,
}: {
  updatingTaskId: string | null;
  children: React.ReactNode;
}) {
  return (
    <SchedulerUpdatingTaskIdContext.Provider value={updatingTaskId}>
      {children}
    </SchedulerUpdatingTaskIdContext.Provider>
  );
}

export function useSchedulerUpdatingTaskId() {
  return useContext(SchedulerUpdatingTaskIdContext);
}
