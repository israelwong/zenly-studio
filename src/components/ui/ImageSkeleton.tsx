'use client';

import { cn } from '@/lib/utils';

interface ImageSkeletonProps {
  /**
   * Aspect ratio de la imagen (ej: "aspect-square", "aspect-video", "aspect-[4/3]")
   * @default "aspect-square"
   */
  aspectRatio?: string;
  /**
   * Clases adicionales de Tailwind
   */
  className?: string;
  /**
   * Si debe mostrar efecto shimmer (gradiente animado)
   * @default true
   */
  shimmer?: boolean;
}

/**
 * ⚠️ HIGIENE UI: Skeleton para imágenes
 * Evita layout shift y parpadeo mientras se cargan las imágenes
 */
export function ImageSkeleton({
  aspectRatio = 'aspect-square',
  className,
  shimmer = true,
}: ImageSkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-zinc-800 animate-pulse rounded-lg',
        aspectRatio,
        className
      )}
    >
      {shimmer && (
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent animate-shimmer" />
      )}
    </div>
  );
}
