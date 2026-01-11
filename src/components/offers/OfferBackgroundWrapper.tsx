'use client';

import { useEffect } from 'react';
import { DynamicBackgroundProvider, useDynamicBackground } from '@/contexts/DynamicBackgroundContext';
import { useDynamicImageColors } from '@/hooks/useDynamicImageColors';

interface OfferBackgroundWrapperProps {
  children: React.ReactNode;
  coverUrl?: string | null;
}

function BackgroundBlobs() {
  const { colors } = useDynamicBackground();

  if (!colors) return null;

  return (
    <>
      {/* Blob 1 - Color dominante (grande, arriba) */}
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[450px] rounded-full blur-3xl animate-pulse transition-opacity duration-[2000ms]"
        style={{
          backgroundColor: colors.primary,
          animationDuration: '8s',
          opacity: 0.5,
        }}
      />

      {/* Blob 2 - Color dominante (mediano, centro-izq) */}
      <div
        className="absolute top-60 left-1/2 -translate-x-1/2 w-[800px] h-[350px] rounded-full blur-3xl transition-opacity duration-[2000ms] delay-300"
        style={{
          backgroundColor: colors.primary,
          opacity: 0.4,
        }}
      />

      {/* Blob 3 - Color acento (grande, abajo centro) */}
      <div
        className="absolute top-96 left-1/2 -translate-x-1/2 w-[600px] h-[450px] rounded-full blur-3xl animate-pulse transition-opacity duration-[2000ms] delay-500"
        style={{
          backgroundColor: colors.accent,
          animationDuration: '10s',
          opacity: 0.45,
        }}
      />
    </>
  );
}

function BackgroundContent({ children, coverUrl }: OfferBackgroundWrapperProps) {
  // Extraer colores iniciales de la portada
  useDynamicImageColors(coverUrl || undefined);

  return (
    <>
      {/* Glassmorphism premium background con colores dinámicos */}
      <div className="fixed inset-0 -z-10">
        {/* Gradiente base zinc más dramático */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black" />

        {/* Blobs dinámicos - por encima del gradiente base */}
        <BackgroundBlobs />

        {/* Vignette sutil en los bordes */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/30" />
      </div>
      {children}
    </>
  );
}

export function OfferBackgroundWrapper({ children, coverUrl }: OfferBackgroundWrapperProps) {
  // Hacer el body transparente para que se vea el fondo dinámico
  useEffect(() => {
    document.body.classList.add('!bg-transparent');
    return () => {
      document.body.classList.remove('!bg-transparent');
    };
  }, []);

  return (
    <DynamicBackgroundProvider>
      <BackgroundContent coverUrl={coverUrl}>
        {children}
      </BackgroundContent>
    </DynamicBackgroundProvider>
  );
}
