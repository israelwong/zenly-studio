'use client';

import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardContent, ZenButton } from '@/components/ui/zen';

interface PromiseNotFoundViewProps {
  studioSlug: string;
}

/**
 * Vista cuando la promesa fue eliminada o no existe.
 * Notifica al prospecto y ofrece navegar al perfil/inicio del estudio.
 */
export function PromiseNotFoundView({ studioSlug }: PromiseNotFoundViewProps) {
  const profileHref = `/${studioSlug}`;

  return (
    <div className="max-w-md mx-auto px-4 pt-8">
      <ZenCard>
        <ZenCardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-700/50 rounded-lg">
              <FileQuestion className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Información no disponible
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Esta información ya no se encuentra disponible
              </p>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent>
          <p className="text-sm text-zinc-300 leading-relaxed mb-6">
            El enlace que seguiste puede haber expirado o la información asociada ya no está disponible. Puedes volver al perfil del estudio para continuar.
          </p>
          <Link href={profileHref}>
            <ZenButton variant="primary" className="w-full">
              Ir al inicio
            </ZenButton>
          </Link>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
