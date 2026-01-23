import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import {
    getPublicOfferBasicData,
    getPublicOfferDeferredContentBlocks,
} from "@/lib/actions/studio/offers/offers.actions";
import { OfferPageHeader } from "./OfferPageHeader";
import { OfferPageStreaming } from "./OfferPageStreaming";
import { OfferPageSkeleton } from "./OfferPageSkeleton";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { PackageX } from "lucide-react";

interface PublicOfferPageProps {
  params: Promise<{ slug: string; offerId: string }>;
  searchParams: Promise<{ preview?: string }>;
}

/**
 * ⚠️ STREAMING: Landing page pública de oferta comercial
 * Fragmentación: Basic (instantáneo) + Deferred (content blocks)
 */
export default async function PublicOfferPage({
  params,
  searchParams,
}: PublicOfferPageProps) {
  const { slug, offerId } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "true";

  try {
    // ⚠️ STREAMING: Cargar datos básicos inmediatamente (instantáneo)
    const basicResult = await getPublicOfferBasicData(offerId, slug);

    if (!basicResult.success || !basicResult.data) {
      // Verificar si la oferta existe pero está inactiva
      const studio = await prisma.studios.findUnique({
        where: { slug },
        select: { id: true, studio_name: true },
      });

      if (studio) {
        const inactiveOffer = await prisma.studio_offers.findFirst({
          where: {
            OR: [
              { id: offerId, studio_id: studio.id },
              { slug: offerId, studio_id: studio.id },
            ],
            is_active: false,
          },
          select: { id: true, name: true },
        });

        if (inactiveOffer) {
          return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-8 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PackageX className="w-8 h-8 text-zinc-500" />
                </div>
                <h1 className="text-lg font-medium text-zinc-300 mb-2">
                  Oferta no disponible
                </h1>
                <p className="text-sm text-zinc-500 mb-6">
                  Esta oferta ha sido archivada o ya no está activa.
                </p>
                <Link
                  href={`/${slug}`}
                  className="inline-block px-4 py-2 text-sm text-zinc-300 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-600 rounded-md transition-colors"
                >
                  Ver perfil del estudio
                </Link>
              </div>
            </div>
          );
        }
      }

      notFound();
    }

    const { offer, studio } = basicResult.data;

    // Si el banner redirige directamente al leadform, redirigir
    if (offer.banner_destination === "LEADFORM_ONLY" || offer.banner_destination === "LEADFORM_WITH_LANDING") {
      redirect(`/${slug}/offer/${offerId}/leadform${isPreview ? "?preview=true" : ""}`);
    }

    // Verificar que tenga landing page
    if (!offer.landing_page) {
      console.error("[PublicOfferPage] Oferta sin landing page configurada");
      notFound();
    }

    // ⚠️ STREAMING: Crear promesa para content blocks pesados (NO await - deferred)
    const contentBlocksPromise = getPublicOfferDeferredContentBlocks(offer.id);

    return (
      <>
        {/* ⚠️ STREAMING: Parte A - Instantánea (header + tracking + background) */}
        <OfferPageHeader
          offer={offer}
          studio={studio}
          studioSlug={slug}
        />

        {/* ⚠️ STREAMING: Parte B - Streaming (content blocks con Suspense) */}
        <Suspense fallback={<OfferPageSkeleton />}>
          <OfferPageStreaming
            basicData={{
              offer: {
                id: offer.id,
                studio_id: offer.studio_id,
                slug: offer.slug,
                landing_page: offer.landing_page,
                leadform: offer.leadform,
              },
              studioSlug: slug,
            }}
            contentBlocksPromise={contentBlocksPromise}
          />
        </Suspense>
      </>
    );
  } catch (error) {
    // Re-lanzar redirects de Next.js (no son errores reales)
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("[PublicOfferPage] Error:", error);
    notFound();
  }
}

import { getPublicOfferMetadata } from "@/lib/actions/studio/offers/offers.actions";

/**
 * ⚠️ METADATA LIGERA: Solo campos esenciales para SEO
 * Elimina la doble carga en generateMetadata
 */
export async function generateMetadata({
  params,
}: PublicOfferPageProps): Promise<Metadata> {
  const { slug, offerId } = await params;

  try {
    const result = await getPublicOfferMetadata(offerId, slug);

    if (!result.success || !result.data) {
      return {
        title: "Oferta no encontrada",
        description: "La oferta solicitada no está disponible",
      };
    }

    const { offer_name, offer_description, studio_name, logo_url } = result.data;

    const title = `${offer_name} - ${studio_name}`;
    const description = offer_description || `Oferta especial de ${studio_name}`;

    // Configurar favicon dinámico usando el logo del studio
    const icons = logo_url ? {
      icon: [
        { url: logo_url, type: 'image/png' },
        { url: logo_url, sizes: '32x32', type: 'image/png' },
        { url: logo_url, sizes: '16x16', type: 'image/png' },
      ],
      apple: [
        { url: logo_url, sizes: '180x180', type: 'image/png' },
      ],
      shortcut: logo_url,
    } : undefined;

    return {
      title,
      description,
      icons, // ← Favicon dinámico
      openGraph: {
        title,
        description,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch (error) {
    console.error("[generateMetadata] Error:", error);
    return {
      title: "Oferta no encontrada",
      description: "La oferta solicitada no está disponible",
    };
  }
}
