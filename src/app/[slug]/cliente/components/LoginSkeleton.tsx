'use client';

import { ZenCard } from '@/components/ui/zen';
import { PublicPageHeader } from '@/components/shared/PublicPageHeader';
import { PublicPageFooter } from '@/components/shared/PublicPageFooter';

export function LoginSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header flotante */}
      <PublicPageHeader
        studioSlug=""
        studioName=""
        subtitle="Portal de Cliente"
        logoUrl={null}
        showProfileButton={true}
      />

      {/* Content centrado */}
      <main className="flex items-center justify-center p-4 pt-28">
        <div className="w-full max-w-md space-y-6">
          <ZenCard>
            {/* Card Header */}
            <div className="border-b border-zinc-800 px-6 py-4 animate-pulse">
              <div className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 bg-zinc-800 rounded"></div>
                <div className="h-5 bg-zinc-800 rounded w-48"></div>
              </div>
            </div>

            {/* Card Content - Formulario */}
            <div className="p-6 space-y-6">
              <div className="h-4 bg-zinc-800 rounded w-3/4 mx-auto animate-pulse"></div>

              <div className="space-y-4">
                {/* Selector de método */}
                <div className="flex gap-2 p-1 bg-zinc-900 rounded-lg border border-zinc-800 animate-pulse">
                  <div className="flex-1 h-10 bg-zinc-800 rounded-md"></div>
                  <div className="flex-1 h-10 bg-zinc-800 rounded-md"></div>
                </div>

                {/* Input */}
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-zinc-800 rounded w-20"></div>
                  <div className="h-10 bg-zinc-800 rounded"></div>
                </div>

                {/* Switch Recordar Sesión */}
                <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-zinc-800 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-32"></div>
                    <div className="h-3 bg-zinc-800 rounded w-48"></div>
                  </div>
                  <div className="h-6 w-11 bg-zinc-800 rounded-full"></div>
                </div>

                {/* Botón */}
                <div className="h-10 bg-zinc-800 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="border-t border-zinc-800 px-6 py-4 bg-zinc-900/30 animate-pulse">
              <div className="h-3 bg-zinc-800 rounded w-full"></div>
            </div>
          </ZenCard>

          {/* Footer by Zen */}
          <PublicPageFooter />
        </div>
      </main>
    </div>
  );
}
