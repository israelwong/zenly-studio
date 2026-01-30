'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { User } from 'lucide-react';
import { formatDisplayDateLong } from '@/lib/utils/date-formatter';
import { toUtcDateOnly } from '@/lib/utils/date-only';

interface DatosContratanteProps {
  promise: {
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    event_type_name: string | null;
    event_date: Date | null;
  };
}

export function DatosContratante({ promise }: DatosContratanteProps) {
  const fechaCelebracionStr = promise.event_date
    ? formatDisplayDateLong(toUtcDateOnly(promise.event_date))
    : null;

  return (
    <ZenCard variant="outlined">
      <ZenCardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <User className="h-5 w-5 text-purple-400" />
          </div>
          <ZenCardTitle className="text-lg">Datos del Contratante</ZenCardTitle>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-400">Nombre</label>
          <p className="text-white mt-1">{promise.contact_name}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-400">Teléfono</label>
          <p className="text-white mt-1">{promise.contact_phone}</p>
        </div>

        {promise.contact_email && (
          <div>
            <label className="text-sm font-medium text-zinc-400">Correo electrónico</label>
            <p className="text-white mt-1">{promise.contact_email}</p>
          </div>
        )}

        {promise.event_type_name && (
          <div>
            <label className="text-sm font-medium text-zinc-400">Tipo de evento</label>
            <p className="text-white mt-1">{promise.event_type_name}</p>
          </div>
        )}

        {fechaCelebracionStr && (
          <div>
            <label className="text-sm font-medium text-zinc-400">Fecha de celebración</label>
            <p className="text-white mt-1 capitalize">{fechaCelebracionStr}</p>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}
