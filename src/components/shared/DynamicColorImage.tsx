'use client';

import { useRef, useEffect } from 'react';
import Image from 'next/image';
import { useIntersectionImageColors } from '@/hooks/useDynamicImageColors';

interface DynamicColorImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  threshold?: number; // % de visibilidad para activar (default 0.5 = 50%)
}

export function DynamicColorImage({
  src,
  alt,
  width,
  height,
  fill,
  className,
  priority,
  threshold = 0.5,
}: DynamicColorImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Hook que detecta cuando la imagen está visible y extrae colores
  useIntersectionImageColors(containerRef, src, threshold);

  return (
    <div ref={containerRef} className={fill ? 'relative w-full h-full' : ''}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        className={className}
        priority={priority}
      />
    </div>
  );
}
