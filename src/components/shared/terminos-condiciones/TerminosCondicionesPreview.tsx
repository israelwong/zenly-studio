'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

interface TerminosCondicionesPreviewProps {
  content: string;
  className?: string;
}

/**
 * Componente para renderizar términos y condiciones con soporte para links automáticos
 * Detecta URLs y las convierte en links clickeables (similar a CaptionWithLinks)
 */
export function TerminosCondicionesPreview({ 
  content, 
  className = '' 
}: TerminosCondicionesPreviewProps) {
  if (!content) return null;

  // Patrón para detectar URLs (http, https, www)
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

  const renderContent = () => {
    const parts = content.split(urlPattern);

    return parts.map((part, index) => {
      // Verificar si es una URL
      if (urlPattern.test(part)) {
        // Asegurar que tenga protocolo si empieza con www
        const href = part.startsWith('www.') ? `https://${part}` : part;

        return (
          <Link
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline transition-colors"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {part}
            <ExternalLink className="w-3 h-3" />
          </Link>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={`text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words ${className}`}>
      {renderContent()}
    </div>
  );
}

