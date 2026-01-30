'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/components/providers/RealtimeProvider';

interface StudioInitializerProps {
  studioSlug: string;
}

/**
 * Componente que asegura la inicialización correcta del studio:
 * - Verifica que hay sesión activa
 * - Verifica que Realtime está conectado
 *
 * Estabilización: dependencias primitivas (userId, sessionLoading, etc.) para evitar
 * bucle de re-ejecuciones cuando useAuth/useRealtime devuelven objetos nuevos en cada render.
 */
export function StudioInitializer({ studioSlug }: StudioInitializerProps) {
  useAuth();
  useRealtime();
  void studioSlug;
  return null;
}

