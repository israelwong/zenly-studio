'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface SchedulerPortalProps {
  children: React.ReactNode;
  isMaximized: boolean;
}

/**
 * Portal para el modo fullscreen del Scheduler.
 * Cuando isMaximized, renderiza los children en document.body para evitar
 * problemas de containing block (transform, overflow) en ancestros.
 */
export function SchedulerPortal({ children, isMaximized }: SchedulerPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !isMaximized) {
    return <>{children}</>;
  }

  return createPortal(children, document.body);
}
