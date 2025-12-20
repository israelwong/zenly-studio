import { useState, useEffect } from 'react';
import { formatRelativeTime } from '@/lib/actions/utils/formatting';

/**
 * Hook para formatear tiempo relativo que se actualiza dinámicamente
 * @param date - Fecha a formatear
 * @param enabled - Si está habilitado, actualiza cada 30 segundos
 * @returns Tiempo relativo formateado (ej: "hace un momento", "hace 10 min")
 */
export function useRelativeTime(date: Date | string | null, enabled: boolean = true): string {
  const [relativeTime, setRelativeTime] = useState<string>('');

  useEffect(() => {
    if (!date) {
      setRelativeTime('');
      return;
    }

    // Calcular tiempo inicial
    const updateTime = () => {
      try {
        setRelativeTime(formatRelativeTime(date));
      } catch {
        setRelativeTime('');
      }
    };

    updateTime();

    // Si está habilitado, actualizar cada 30 segundos
    if (enabled) {
      const interval = setInterval(updateTime, 30000); // 30 segundos
      return () => clearInterval(interval);
    }
  }, [date, enabled]);

  return relativeTime;
}
