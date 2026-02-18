import React from 'react';
import Link from 'next/link';
import { Info } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardContent, ZenButton } from '@/components/ui/zen';

export const dynamic = 'force-dynamic';

interface NoDisponiblePageProps {
  params: Promise<{ slug: string; promiseId: string }>;
}

/**
 * Ruta física cuando la promesa está en estado no disponible (archivada).
 * El prospecto ve un mensaje profesional y se le indica contactar al estudio.
 * En la interfaz pública nunca se muestra "Archivada"; solo "No disponible".
 */
export default async function NoDisponiblePage({ params }: NoDisponiblePageProps) {
  const { slug } = await params;

  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      <ZenCard>
        <ZenCardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <Info className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                No disponible
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Esta información ya no se encuentra disponible
              </p>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent>
          <p className="text-sm text-zinc-300 leading-relaxed mb-6">
            Esta información ya no se encuentra disponible. Por favor, contacta al estudio para más detalles.
          </p>
          <Link href={`/${slug}`}>
            <ZenButton variant="primary" className="w-full">
              Ir al perfil del estudio
            </ZenButton>
          </Link>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
