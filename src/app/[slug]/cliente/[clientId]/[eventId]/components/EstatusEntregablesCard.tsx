'use client';

import { Package, CheckCircle2 } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenBadge } from '@/components/ui/zen';
import type { DashboardInfo } from '@/lib/actions/public/cliente/dashboard.actions';

interface EstatusEntregablesCardProps {
  dashboardInfo: DashboardInfo | null;
  loading: boolean;
}

export function EstatusEntregablesCard({ dashboardInfo, loading }: EstatusEntregablesCardProps) {
  // Filtrar stages archivados
  const stages = (dashboardInfo?.pipeline_stages || []).filter(
    (stage) => stage.slug !== 'archivado' && stage.slug !== 'archived'
  );
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
          <div className="text-sm text-zinc-400">Cargando...</div>
        ) : stages.length > 0 ? (
          <div className="relative">
            {/* Timeline vertical con líneas */}
            <div className="flex flex-col gap-0">
              {stages.map((stage, index) => {
                const isCompleted = currentStageIndex >= index;
                const isCurrent = stage.is_current;
                const isLast = index === stages.length - 1;

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
                          className={`text-sm font-medium transition-colors ${isCompleted ? 'text-zinc-100' : 'text-zinc-500'
                            }`}
                        >
                          {stage.name}
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

