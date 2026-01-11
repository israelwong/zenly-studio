'use client';

import { useEffect, useRef } from 'react';
import ColorThief from 'colorthief';
import { useDynamicBackground } from '@/contexts/DynamicBackgroundContext';

// Función helper para convertir RGB a Hex
const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

export function useDynamicImageColors(imageUrl?: string) {
  const { setColors } = useDynamicBackground();
  const hasExtractedRef = useRef(false);

  useEffect(() => {
    if (!imageUrl || hasExtractedRef.current) return;

    const img = document.createElement('img');
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const colorThief = new ColorThief();
        const palette = colorThief.getPalette(img, 2);

        if (palette && palette.length >= 2) {
          const primary = rgbToHex(palette[0][0], palette[0][1], palette[0][2]);
          const accent = rgbToHex(palette[1][0], palette[1][1], palette[1][2]);
          
          setColors({ primary, accent });
          hasExtractedRef.current = true;
        }
      } catch (error) {
        console.error('Error extracting colors:', error);
      }
    };

    img.onerror = () => {
      console.warn('Failed to load image for color extraction:', imageUrl);
    };

    img.src = imageUrl;
  }, [imageUrl, setColors]);
}

export function useIntersectionImageColors(
  elementRef: React.RefObject<HTMLElement>,
  imageUrl?: string,
  threshold = 0.5
) {
  const { setColors } = useDynamicBackground();

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !imageUrl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Imagen visible, extraer colores
            const img = document.createElement('img');
            img.crossOrigin = 'Anonymous';

            img.onload = () => {
              try {
                const colorThief = new ColorThief();
                const palette = colorThief.getPalette(img, 2);

                if (palette) {
                  setColors({
                    primary: rgbToHex(palette[0][0], palette[0][1], palette[0][2]),
                    accent: rgbToHex(palette[1][0], palette[1][1], palette[1][2]),
                  });
                }
              } catch (error) {
                console.error('Error extracting colors:', error);
              }
            };

            img.src = imageUrl;
          }
        });
      },
      {
        threshold,
        rootMargin: '0px',
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, imageUrl, threshold, setColors]);
}
