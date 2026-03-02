'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Fase 29.4: Skeleton del modal de autorización (frame + 3 círculos + líneas de carga) */
export function AutorizarCotizacionSkeleton() {
  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold',
                step === 1 ? 'bg-blue-500 text-white ring-2 ring-blue-500/50' : 'bg-zinc-800 text-zinc-400'
              )}
            >
              {step}
            </div>
            {step < 3 && <div className="h-0.5 flex-1 bg-zinc-800" />}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-8 space-y-2">
        <div className="h-6 w-3/4 bg-zinc-800 rounded animate-pulse" />
        <div className="h-4 w-full max-w-sm bg-zinc-800/80 rounded animate-pulse" />
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400/80">
        <Shield className="h-3.5 w-3.5 shrink-0" />
        <span>Conexión segura • Tus datos están encriptados</span>
      </div>
      <div className="py-6 space-y-4">
        <div className="h-10 bg-zinc-800 rounded animate-pulse" />
        <div className="h-10 bg-zinc-800 rounded animate-pulse" />
        <div className="h-10 bg-zinc-800 rounded animate-pulse" />
        <div className="h-24 bg-zinc-800/80 rounded animate-pulse" />
      </div>
      <div className="flex items-center justify-between gap-3 pt-6 border-t border-zinc-800">
        <div className="h-9 w-20 bg-zinc-800 rounded-md animate-pulse" />
        <div className="h-9 w-24 bg-zinc-800 rounded-md animate-pulse" />
      </div>
    </>
  );
}
