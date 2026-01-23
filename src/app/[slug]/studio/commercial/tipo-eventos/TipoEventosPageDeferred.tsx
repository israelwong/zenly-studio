'use client';

import { use } from 'react';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';

interface TipoEventosPageDeferredProps {
  tiposEvento: TipoEventoData[];
  studioSlug: string;
  statsPromise?: Promise<{
    success: boolean;
    data?: Array<{
      tipoId: string;
      eventosCount: number;
      paquetesCount: number;
      promesasCount: number;
    }>;
  }>;
}

/**
 * ⚠️ STREAMING: Componente deferred para estadísticas de uso
 * Se puede expandir en el futuro para mostrar métricas detalladas
 */
export function TipoEventosPageDeferred({
  tiposEvento,
  studioSlug,
}: TipoEventosPageDeferredProps) {
  // Por ahora solo renderiza null - se puede expandir con estadísticas
  // cuando se necesite mostrar métricas de uso por tipo de evento
  return null;
}
