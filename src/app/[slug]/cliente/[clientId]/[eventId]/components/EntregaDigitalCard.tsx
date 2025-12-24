'use client';

import { useRouter } from 'next/navigation';
import { FileText, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton } from '@/components/ui/zen';
import type { DashboardInfo } from '@/lib/actions/cliente/dashboard.actions';

interface EntregaDigitalCardProps {
  dashboardInfo: DashboardInfo | null;
  loading: boolean;
  slug: string;
  clientId: string;
  eventId: string;
}

export function EntregaDigitalCard({ dashboardInfo, loading, slug, clientId, eventId }: EntregaDigitalCardProps) {
  const router = useRouter();

  return (
    <ZenCard>
      <ZenCardHeader>
        <ZenCardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-400" />
          Entrega Digital
        </ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-zinc-400">Cargando...</div>
        ) : dashboardInfo?.entregables_status ? (
          <div className="space-y-3">
            {dashboardInfo.entregables_status.has_entregables ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-zinc-300">
                    {dashboardInfo.entregables_status.entregados_count} entregable(s) disponible(s)
                  </span>
                </div>
                {dashboardInfo.entregables_status.last_delivery_date && (
                  <div className="text-xs text-zinc-500">
                    Última entrega: {new Date(dashboardInfo.entregables_status.last_delivery_date).toLocaleDateString('es-MX')}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-zinc-400">Pendiente de entrega</span>
              </div>
            )}
            <ZenButton
              variant="secondary"
              className="w-full"
              onClick={() => router.push(`/${slug}/cliente/${clientId}/${eventId}/entrega-digital`)}
            >
              Ver entregables
              <ArrowRight className="h-4 w-4 ml-2" />
            </ZenButton>
          </div>
        ) : (
          <div className="text-sm text-zinc-400">No hay información disponible</div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

