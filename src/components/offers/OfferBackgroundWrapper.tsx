'use client';

import { DynamicBackgroundProvider, useDynamicBackground } from '@/contexts/DynamicBackgroundContext';
import { useDynamicImageColors } from '@/hooks/useDynamicImageColors';

interface OfferBackgroundWrapperProps {
  children: React.ReactNode;
  coverUrl?: string | null;
}

function BackgroundBlobs() {
  const { colors } = useDynamicBackground();

  return (
    <>
      {/* Blobs con 2 colores elegantes - cambian dinámicamente */}
      {colors && (
        <>
          {/* Blob 1 - Color dominante (grande, arriba) */}
          <div
            className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[450px] rounded-full blur-3xl opacity-0 animate-pulse transition-all duration-[2000ms]"
            style={{
              backgroundColor: colors.primary,
              animationDuration: '8s',
              opacity: 0.35
            }}
          />

          {/* Blob 2 - Color dominante (mediano, centro-izq) */}
          <div
            className="absolute top-60 left-1/2 -translate-x-1/2 w-[800px] h-[350px] rounded-full blur-3xl opacity-0 transition-all duration-[2000ms] delay-300"
            style={{
              backgroundColor: colors.primary,
              opacity: 0.25
            }}
          />

          {/* Blob 3 - Color acento (grande, abajo centro) */}
          <div
            className="absolute top-96 left-1/2 -translate-x-1/2 w-[600px] h-[450px] rounded-full blur-3xl opacity-0 animate-pulse transition-all duration-[2000ms] delay-500"
            style={{
              backgroundColor: colors.accent,
              animationDuration: '10s',
              opacity: 0.3
            }}
          />
        </>
      )}
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

        {/* Blobs dinámicos */}
        <BackgroundBlobs />

        {/* Vignette sutil en los bordes */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/40" />
      </div>
      {children}
    </>
  );
}

export function OfferBackgroundWrapper({ children, coverUrl }: OfferBackgroundWrapperProps) {
  return (
    <DynamicBackgroundProvider>
      <BackgroundContent coverUrl={coverUrl}>
        {children}
      </BackgroundContent>
    </DynamicBackgroundProvider>
  );
}
