'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Send, Loader2 } from 'lucide-react';
import { ZenButton, ZenBadge } from '@/components/ui/zen';
import {
  ZenDropdownMenu,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuSeparator,
} from '@/components/ui/zen';
import { publicarCronograma, obtenerConteoTareasDraft } from '@/lib/actions/studio/business/events/scheduler-actions';
import { toast } from 'sonner';

interface PublicationBarProps {
  studioSlug: string;
  eventId: string;
  onPublished?: () => void;
}

export function PublicationBar({ studioSlug, eventId, onPublished }: PublicationBarProps) {
  const [draftCount, setDraftCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const checkDraftCount = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const result = await obtenerConteoTareasDraft(studioSlug, eventId);
      if (result.success && result.count !== undefined && isMountedRef.current) {
        setDraftCount(result.count);
        console.log(`[PublicationBar] Tareas DRAFT encontradas: ${result.count}`);
      } else if (result.error) {
        console.error('[PublicationBar] Error obteniendo conteo:', result.error);
      }
    } catch (error) {
      console.error('[PublicationBar] Error obteniendo conteo de tareas DRAFT:', error);
    } finally {
      if (isMountedRef.current) {
        setChecking(false);
      }
    }
  }, [studioSlug, eventId]);

  useEffect(() => {
    isMountedRef.current = true;
    checkDraftCount();
    
    // Escuchar eventos personalizados para actualizar el conteo
    const handleTaskUpdate = () => {
      if (isMountedRef.current) {
        checkDraftCount();
      }
    };
    
    window.addEventListener('scheduler-task-updated', handleTaskUpdate);
    window.addEventListener('scheduler-task-created', handleTaskUpdate);
    
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('scheduler-task-updated', handleTaskUpdate);
      window.removeEventListener('scheduler-task-created', handleTaskUpdate);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkDraftCount]);

  const handlePublicar = async (opcion: 'solo_publicar' | 'publicar_e_invitar') => {
    setLoading(true);
    try {
      const result = await publicarCronograma(studioSlug, eventId, opcion);

      if (result.success) {
        if (opcion === 'solo_publicar') {
          toast.success(`${result.publicado || 0} tarea(s) publicada(s) correctamente`);
        } else {
          const total = (result.publicado || 0) + (result.sincronizado || 0);
          toast.success(
            `${result.sincronizado || 0} tarea(s) sincronizada(s) con Google Calendar. ${result.publicado || 0} publicada(s) sin sincronizar.`
          );
        }
        setDraftCount(0);
        onPublished?.();
        await checkDraftCount();
      } else {
        toast.error(result.error || 'Error al publicar cronograma');
      }
    } catch (error) {
      console.error('Error publicando cronograma:', error);
      toast.error('Error al publicar cronograma');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar solo si ya terminó de verificar Y hay tareas DRAFT
  // Durante la carga inicial (checking === true), no mostrar nada
  if (checking) {
    return null;
  }
  
  // Si no hay tareas DRAFT después de verificar, no mostrar
  if (draftCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[400px]">
        <div className="flex items-center gap-2 flex-1">
          <ZenBadge variant="warning" size="sm">
            {draftCount} {draftCount === 1 ? 'cambio pendiente' : 'cambios pendientes'}
          </ZenBadge>
          <span className="text-sm text-zinc-300">
            Tienes cambios sin publicar en el cronograma
          </span>
        </div>

        <ZenDropdownMenu>
          <ZenDropdownMenuTrigger asChild>
            <ZenButton
              variant="primary"
              size="sm"
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Publicar
                </>
              )}
            </ZenButton>
          </ZenDropdownMenuTrigger>
          <ZenDropdownMenuContent align="end" className="w-56">
            <ZenDropdownMenuItem
              onClick={() => handlePublicar('solo_publicar')}
              disabled={loading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Solo Publicar
              <span className="text-xs text-zinc-500 ml-auto">
                Visible en ZEN
              </span>
            </ZenDropdownMenuItem>
            <ZenDropdownMenuSeparator />
            <ZenDropdownMenuItem
              onClick={() => handlePublicar('publicar_e_invitar')}
              disabled={loading}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Publicar e Invitar
              <span className="text-xs text-zinc-500 ml-auto">
                + Google Calendar
              </span>
            </ZenDropdownMenuItem>
          </ZenDropdownMenuContent>
        </ZenDropdownMenu>
      </div>
    </div>
  );
}

