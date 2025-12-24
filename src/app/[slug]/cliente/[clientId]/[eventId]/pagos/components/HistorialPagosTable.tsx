'use client';

import { Receipt } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent } from '@/components/ui/zen';
import type { ClientPago } from '@/types/client';
import { PagoItem } from './PagoItem';

interface HistorialPagosTableProps {
  pagos: ClientPago[];
  headerActions?: React.ReactNode;
}

export function HistorialPagosTable({ pagos, headerActions }: HistorialPagosTableProps) {
  return (
    <ZenCard>
      <ZenCardHeader className="flex items-center justify-between">
        <ZenCardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-emerald-400" />
          Historial de Pagos
        </ZenCardTitle>
        {headerActions}
      </ZenCardHeader>

      <ZenCardContent>
        {pagos.length > 0 ? (
          <div className="space-y-3">
            {pagos.map((pago) => (
              <PagoItem key={pago.id} pago={pago} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Receipt className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">No hay pagos registrados</p>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

