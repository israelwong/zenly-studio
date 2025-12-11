"use client";

import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";

interface OfferHeaderProps {
  studioSlug: string;
  studioName?: string | null;
  studioSlogan?: string | null;
  logoUrl?: string | null;
}

/**
 * Header compartido para páginas públicas de ofertas
 * Usado en landing y leadform
 */
export function OfferHeader({
  studioSlug,
  studioName,
  studioSlogan,
  logoUrl,
}: OfferHeaderProps) {
  return (
    <div className="fixed top-4 left-0 right-0 z-50 md:top-5 px-4 md:px-0">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/60 backdrop-blur-md border-b border-zinc-800/30 shadow-lg shadow-zinc-950/10 rounded-xl">
          {/* Logo + Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-zinc-800/80 rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-zinc-700/50">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 bg-zinc-600 rounded-lg" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-zinc-50 truncate">
                {studioName || 'Studio'}
              </h1>
              {studioSlogan && (
                <p className="text-xs text-zinc-400 truncate">
                  {studioSlogan}
                </p>
              )}
            </div>
          </div>

          {/* Botón Visitar Perfil */}
          <Link
            href={`/${studioSlug}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:text-white bg-zinc-800/50 hover:bg-zinc-800/70 border border-zinc-700/50 hover:border-zinc-600 rounded-lg transition-all shrink-0"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Perfil</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
