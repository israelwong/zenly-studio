"use client";

import { PublicPageHeader } from "@/components/shared/PublicPageHeader";

interface OfferHeaderProps {
  studioSlug: string;
  studioName?: string | null;
  studioSlogan?: string | null;
  logoUrl?: string | null;
}

/**
 * Header para páginas públicas de ofertas
 * Wrapper de PublicPageHeader para compatibilidad
 */
export function OfferHeader({
  studioSlug,
  studioName,
  studioSlogan,
  logoUrl,
}: OfferHeaderProps) {
  return (
    <PublicPageHeader
      studioSlug={studioSlug}
      studioName={studioName}
      subtitle={studioSlogan}
      logoUrl={logoUrl}
      showProfileButton={true}
    />
  );
}
