"use client";

import Image from "next/image";
import { Tag, Clock } from "lucide-react";

interface OfferCardPreviewProps {
  name: string;
  description?: string;
  coverMediaUrl?: string | null;
  coverMediaType?: "image" | "video" | null;
  discountPercentage?: number | null;
  validUntil?: string | null;
}

/**
 * Preview del card de oferta - Diseño compact (mobile)
 * Replica el diseño de OfferCard variant="compact"
 */
export function OfferCardPreview({
  name,
  description,
  coverMediaUrl,
  coverMediaType,
  discountPercentage,
  validUntil,
}: OfferCardPreviewProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const validityText = validUntil ? `Válido hasta ${formatDate(validUntil)}` : null;

  return (
    <div className="w-full">
      {/* Card Compact - Horizontal layout para mobile carousel */}
      <div className="bg-purple-950/10 rounded-lg border border-purple-900/40 transition-all group">
        <div className="flex items-center gap-3 p-3">
          {/* Cover - Un poco más grande */}
          <div className="relative w-20 h-20 flex-shrink-0 bg-zinc-800 rounded overflow-hidden">
            {coverMediaUrl ? (
              coverMediaType === "video" ? (
                <video
                  src={coverMediaUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <Image
                  src={coverMediaUrl}
                  alt={name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-zinc-800 to-zinc-900">
                <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Content - Compacto */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-100 group-hover:text-purple-400 transition-colors line-clamp-1">
              {name || "Nombre de la oferta"}
            </p>

            {/* Descripción compacta - máximo 100 caracteres */}
            {description && (
              <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5 pr-4">
                {description.length > 100
                  ? `${description.substring(0, 100)}...`
                  : description
                }
              </p>
            )}

            {/* Badges inline */}
            <div className="flex items-center gap-2 mt-1">
              {discountPercentage && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300">
                  <Tag className="w-3 h-3" />
                  {discountPercentage}%
                </span>
              )}
              {validityText && (
                <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                  <Clock className="w-3 h-3" />
                  {validityText}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
