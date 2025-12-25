'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Package, CheckCircle2 } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenBadge } from '@/components/ui/zen';
import { obtenerDashboardInfo } from '@/lib/actions/cliente/dashboard.actions';
import { createClient } from '@/lib/supabase/client';
import { createRealtimeChannel, subscribeToChannel, setupRealtimeAuth } from '@/lib/realtime/core';
import type { DashboardInfo } from '@/lib/actions/cliente/dashboard.actions';

interface EstatusEntregablesCardProps {
  dashboardInfo: DashboardInfo | null;
  loading: boolean;
}

// Mapeo de slugs a mensajes personalizados
const getStageDisplayName = (slug: string, name: string): string => {
  const slugLower = slug.toLowerCase();

  if (slugLower === 'planeacion' || slugLower === 'planning') {
    return 'Planeación';
  }
  if (slugLower === 'produccion' || slugLower === 'production') {
    return 'Cobertura del evento';
  }
  if (slugLower === 'revision' || slugLower === 'review') {
    return 'Revisión interna';
  }
  if (slugLower === 'entrega' || slugLower === 'delivery') {
    return 'Preparando entrega';
  }
  if (slugLower === 'archivado' || slugLower === 'archived') {
    return 'Entregado';
  }

  return name;
};

export function EstatusEntregablesCard({ dashboardInfo: initialDashboardInfo, loading: initialLoading }: EstatusEntregablesCardProps) {
  const params = useParams();
  const slug = params.slug as string;
  const clientId = params.clientId as string;
  const eventId = params.eventId as string;

  const [dashboardInfo, setDashboardInfo] = useState<DashboardInfo | null>(initialDashboardInfo);
  const [loading, setLoading] = useState(initialLoading);
  const channelRef = useRef<any>(null);
  const supabase = createClient();

  // Cargar dashboard info
  const loadDashboardInfo = async () => {
    try {
      setLoading(true);
      const result = await obtenerDashboardInfo(eventId, clientId, slug);
      if (result.success && result.data) {
        setDashboardInfo(result.data);
      }
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Actualizar estado cuando cambien las props iniciales
  useEffect(() => {
    if (initialDashboardInfo) {
      setDashboardInfo(initialDashboardInfo);
    }
    setLoading(initialLoading);
  }, [initialDashboardInfo, initialLoading]);

  // Cargar datos iniciales si no vienen en las props
  useEffect(() => {
    if (!initialDashboardInfo && eventId && clientId && slug) {
      loadDashboardInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, clientId, slug]); // Cargar cuando cambien los params

  // Configurar realtime para escuchar cambios en studio_events
  useEffect(() => {
    if (!slug || !eventId) return;

    const setupRealtime = async () => {
      try {
        const requiresAuth = false;
        const authResult = await setupRealtimeAuth(supabase, requiresAuth);

        if (!authResult.success && requiresAuth) {
          return;
        }

        const channelName = `studio:${slug}:events`;
        const channel = createRealtimeChannel(supabase, {
          channelName,
          isPrivate: false,
          requiresAuth: false,
          self: true,
          ack: true,
        });

        // Escuchar cambios en eventos (cuando cambia el stage_id)
        channel
          .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
            const p = payload as any;
            const eventNew = p.record || p.new || p.payload?.record || p.payload?.new;
            const eventOld = p.old || p.old_record || p.payload?.old || p.payload?.old_record;

            // Verificar si es el evento que estamos viendo
            if (eventNew && (eventNew.id === eventId || eventNew.promise_id === eventId)) {
              // Verificar si cambió el stage_id
              const newStageId = eventNew.stage_id;
              const oldStageId = eventOld?.stage_id;

              if (newStageId !== oldStageId) {
                // Actualizar solo el estado local de los stages
                setDashboardInfo((prev) => {
                  if (!prev) return prev;

                  return {
                    ...prev,
                    pipeline_stages: prev.pipeline_stages.map((stage) => ({
                      ...stage,
                      is_current: stage.id === newStageId,
                    })),
                  };
                });
              }
            }
          })
          .on('broadcast', { event: '*' }, (payload: unknown) => {
            const p = payload as any;
            const operation = p.operation || p.event;
            if (operation === 'UPDATE') {
              const eventNew = p.record || p.new || p.payload?.record || p.payload?.new;
              const eventOld = p.old || p.old_record || p.payload?.old || p.payload?.old_record;

              if (eventNew && (eventNew.id === eventId || eventNew.promise_id === eventId)) {
                const newStageId = eventNew.stage_id;
                const oldStageId = eventOld?.stage_id;

                if (newStageId !== oldStageId) {
                  setDashboardInfo((prev) => {
                    if (!prev) return prev;

                    return {
                      ...prev,
                      pipeline_stages: prev.pipeline_stages.map((stage) => ({
                        ...stage,
                        is_current: stage.id === newStageId,
                      })),
                    };
                  });
                }
              }
            }
          });

        await subscribeToChannel(channel);
        channelRef.current = channel;
      } catch (error) {
        console.error('[EstatusEntregablesCard] Error configurando realtime:', error);
      }
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [slug, eventId, supabase]);

  // Mostrar todos los stages (incluyendo archivado que se mostrará como "Entregado")
  const stages = dashboardInfo?.pipeline_stages || [];
  const currentStageIndex = stages.findIndex((stage) => stage.is_current);

  return (
    <ZenCard>
      <ZenCardHeader>
        <ZenCardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-400" />
          Estatus de tu evento
        </ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="space-y-4">
        {loading ? (
          <div className="relative">
            {/* Timeline skeleton */}
            <div className="flex flex-col gap-0">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="relative flex items-start gap-4 pb-4 last:pb-0">
                  {/* Línea vertical izquierda skeleton */}
                  <div className="flex flex-col items-center shrink-0">
                    {/* Dot skeleton */}
                    <div className="w-4 h-4 rounded-full bg-zinc-800 animate-pulse" />
                    {/* Línea vertical skeleton */}
                    {i < 4 && (
                      <div className="w-0.5 mt-1 mb-1 flex-1 bg-zinc-800/30 min-h-[24px] animate-pulse" />
                    )}
                  </div>
                  {/* Contenido skeleton */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse" />
                      {i === 2 && (
                        <div className="h-5 bg-zinc-800 rounded-full w-12 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : stages.length > 0 ? (
          <div className="relative">
            {/* Timeline vertical con líneas */}
            <div className="flex flex-col gap-0">
              {stages.map((stage, index) => {
                const isCompleted = currentStageIndex >= index;
                const isCurrent = stage.is_current;
                const isLast = index === stages.length - 1;
                const displayName = getStageDisplayName(stage.slug, stage.name);

                return (
                  <div key={stage.id} className="relative flex items-start gap-4 pb-4 last:pb-0">
                    {/* Línea vertical izquierda */}
                    <div className="flex flex-col items-center shrink-0">
                      {/* Dot del stage */}
                      <div className="relative z-10">
                        <div
                          className={`w-4 h-4 rounded-full border-2 transition-all ${isCompleted
                            ? isCurrent
                              ? 'ring-2 ring-offset-2 ring-offset-zinc-900'
                              : ''
                            : 'opacity-50'
                            }`}
                          style={
                            isCurrent
                              ? {
                                backgroundColor: isCompleted ? stage.color : 'transparent',
                                borderColor: stage.color,
                                boxShadow: `0 0 0 2px ${stage.color}40, 0 0 0 4px ${stage.color}20`,
                              }
                              : {
                                backgroundColor: isCompleted ? stage.color : 'transparent',
                                borderColor: stage.color,
                              }
                          }
                        >
                          {isCurrent && (
                            <div
                              className="absolute inset-0 rounded-full animate-pulse"
                              style={{ backgroundColor: stage.color, opacity: 0.3 }}
                            />
                          )}
                        </div>
                      </div>
                      {/* Línea vertical entre dots */}
                      {!isLast && (
                        <div
                          className={`w-0.5 mt-1 mb-1 flex-1 ${isCompleted ? 'opacity-100' : 'opacity-30'
                            }`}
                          style={{
                            backgroundColor: isCompleted ? stage.color : stage.color,
                            minHeight: '24px',
                          }}
                        />
                      )}
                    </div>

                    {/* Contenido del stage */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm transition-colors ${
                            isCurrent 
                              ? 'text-zinc-100' 
                              : isCompleted 
                                ? 'text-zinc-100' 
                                : 'text-zinc-500'
                          }`}
                        >
                          {displayName}
                        </span>
                        {isCurrent && (
                          <ZenBadge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border-amber-500/30"
                          >
                            Actual
                          </ZenBadge>
                        )}
                        {isCompleted && !isCurrent && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-400">No hay información de pipeline disponible</div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

