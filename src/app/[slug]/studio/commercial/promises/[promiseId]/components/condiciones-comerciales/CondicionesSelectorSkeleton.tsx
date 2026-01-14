'use client';

import React from 'react';

export function CondicionesSelectorSkeleton() {
  return (
    <div className="space-y-4">
      {/* Mensaje informativo skeleton */}
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
        <div className="h-4 w-3/4 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-3 w-1/2 bg-zinc-700 rounded animate-pulse" />
      </div>

      {/* Lista de condiciones skeleton */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 space-y-2"
          >
            {/* Radio button y nombre */}
            <div className="flex items-start gap-3">
              <div className="h-4 w-4 rounded-full border-2 border-zinc-700 bg-zinc-800 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 bg-zinc-700 rounded animate-pulse" />
                <div className="h-3 w-full bg-zinc-700 rounded animate-pulse" />
              </div>
            </div>
            
            {/* Detalles (anticipo, descuento) */}
            <div className="flex items-center gap-4 pl-7">
              <div className="h-3 w-24 bg-zinc-700 rounded animate-pulse" />
              <div className="h-3 w-20 bg-zinc-700 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
