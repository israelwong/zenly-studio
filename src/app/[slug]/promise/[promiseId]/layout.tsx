import React from 'react';
import Link from 'next/link';
import { PublicPageFooter } from '@/components/shared/PublicPageFooter';
import { prisma } from '@/lib/prisma';

interface PromiseLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PromiseLayout({
  children,
  params,
}: PromiseLayoutProps) {
  const { slug } = await params;

  // Obtener información básica del studio para el header
  const studio = await prisma.studios.findUnique({
    where: { slug },
    select: {
      studio_name: true,
      slogan: true,
      logo_url: true,
    },
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header fijo */}
      {studio && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {studio.logo_url && (
                <img
                  src={studio.logo_url}
                  alt={studio.studio_name}
                  className="h-9 w-9 object-contain rounded-full"
                />
              )}
              <div>
                <h1 className="text-sm font-semibold text-white">
                  {studio.studio_name}
                </h1>
                {studio.slogan && (
                  <p className="text-[10px] text-zinc-400">
                    {studio.slogan}
                  </p>
                )}
              </div>
            </div>
            <Link
              href={`/${slug}`}
              className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              Ver perfil
            </Link>
          </div>
        </header>
      )}

      {/* Contenido principal con padding-top para header */}
      <div className="pt-[65px]">
        {children}
      </div>

      {/* Footer by Zen */}
      <PublicPageFooter />
    </div>
  );
}
