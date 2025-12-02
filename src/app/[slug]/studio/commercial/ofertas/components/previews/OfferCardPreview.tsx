"use client";

import { ChevronRight } from "lucide-react";
import Image from "next/image";

interface OfferCardPreviewProps {
  name: string;
  description?: string;
  coverMediaUrl?: string | null;
  coverMediaType?: "image" | "video" | null;
}

/**
 * Preview del card de oferta como aparecerá en el feed público
 * Diseño minimalista tipo story/post
 */
export function OfferCardPreview({
  name,
  description,
  coverMediaUrl,
  coverMediaType,
}: OfferCardPreviewProps) {
  return (
    <div className="pt-4">
      {/* Card Principal - Solo imagen/video */}
      <div className="bg-zinc-900/50 rounded-2xl overflow-hidden border border-zinc-800/50 backdrop-blur-sm">
        {/* Cover Media - Full card con aspect ratio natural */}
        <div className="relative w-full bg-zinc-800">
          {coverMediaUrl ? (
            <>
              {coverMediaType === "video" ? (
                <video
                  src={coverMediaUrl}
                  className="w-full h-auto"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <Image
                  src={coverMediaUrl}
                  alt={name}
                  width={800}
                  height={800}
                  className="w-full h-auto"
                  priority
                />
              )}
            </>
          ) : (
            <div className="w-full aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
              <div className="text-center space-y-2">
                <svg
                  className="w-12 h-12 mx-auto text-zinc-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-xs text-zinc-500">Sin portada</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer minimalista con botón discreto */}
        <div className="px-4 py-3 border-t border-zinc-800/50">
          <button className="w-full flex items-center justify-between text-zinc-400 hover:text-emerald-400 transition-colors group">
            <span className="text-sm font-medium">Ver oferta</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Hint text */}
      <p className="text-xs text-zinc-500 text-center px-4 mt-3">
        Vista previa de cómo se verá en tu feed público
      </p>
    </div>
  );
}
