import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPublicOffer } from "@/lib/actions/studio/offers/offers.actions";
import { OfferLandingPage } from "@/components/offers/OfferLandingPage";
import { TrackingScripts } from "@/components/offers/TrackingScripts";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { ContentBlock } from "@/types/content-blocks";
import { PackageX, ExternalLink } from "lucide-react";

interface PublicOfferPageProps {
  params: Promise<{ slug: string; offerId: string }>;
}

/**
 * Landing page pública de oferta comercial
 */
export default async function PublicOfferPage({
  params,
}: PublicOfferPageProps) {
  const { slug, offerId } = await params;

  try {
    // Obtener oferta pública (solo activas)
    const offerResult = await getPublicOffer(offerId, slug);

    if (!offerResult.success || !offerResult.data) {
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
          // Mostrar mensaje de oferta no disponible
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

      // Si no existe en absoluto, mostrar 404
      notFound();
    }

    const offer = offerResult.data;

    // Obtener datos del estudio para tracking y header
    const studio = await prisma.studios.findUnique({
      where: { slug },
      select: {
        gtm_id: true,
        facebook_pixel_id: true,
        studio_name: true,
        slogan: true,
        logo_url: true,
      },
    });

    // Verificar que tenga landing page
    if (!offer.landing_page) {
      console.error("[PublicOfferPage] Oferta sin landing page configurada");
      notFound();
    }

    return (
      <>
        {/* Scripts de tracking */}
        <TrackingScripts
          gtmId={studio?.gtm_id || undefined}
          facebookPixelId={studio?.facebook_pixel_id || undefined}
          customEvents={[
            {
              eventName: "offer_landing_view",
              eventData: {
                offer_id: offer.id,
                offer_slug: offer.slug,
                offer_name: offer.name,
              },
            },
            {
              eventName: "ViewContent",
              eventData: {
                content_name: offer.slug,
                content_category: "offer",
              },
            },
          ]}
        />

        {/* Wrapper con fondo de portada + overlay */}
        <div className="min-h-screen relative">
          {/* Imagen de fondo con overlay */}
          <div className="fixed inset-0 -z-10">
            {offer.cover_media_url ? (
              <>
                <Image
                  src={offer.cover_media_url}
                  alt="Background"
                  fill
                  className="object-cover object-top"
                  priority
                />
                {/* Overlay oscuro + blur */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-2xl" />
              </>
            ) : (
              <div className="absolute inset-0 bg-zinc-950" />
            )}
          </div>

          {/* Header sticky fixed en top */}
          <div className="fixed top-0 left-0 right-0 z-50 md:top-5 px-4 md:px-0">
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/60 backdrop-blur-md border-b border-zinc-800/30 shadow-lg shadow-zinc-950/10 md:rounded-xl">
                {/* Logo + Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-zinc-800/80 rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-zinc-700/50">
                    {studio?.logo_url ? (
                      <Image
                        src={studio.logo_url}
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
                      {studio?.studio_name || 'Studio'}
                    </h1>
                    {studio?.slogan && (
                      <p className="text-xs text-zinc-400 truncate">
                        {studio.slogan}
                      </p>
                    )}
                  </div>
                </div>

                {/* Botón Visitar Perfil */}
                <Link
                  href={`/${slug}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:text-white bg-zinc-800/50 hover:bg-zinc-800/70 border border-zinc-700/50 hover:border-zinc-600 rounded-lg transition-all shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Perfil</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Container mobile centrado con padding-top para header */}
          <div className="max-w-md mx-auto min-h-screen md:py-8 pt-[57px] px-4 md:px-0">
            {/* Wrapper con scroll y glassmorphism */}
            <div className="min-h-[calc(100vh-57px)] bg-zinc-950/50 backdrop-blur-md md:rounded-xl">
              {/* Content */}
              <OfferLandingPage
                studioSlug={slug}
                offerId={offer.id}
                offerSlug={offer.slug}
                contentBlocks={
                  (offer.landing_page.content_blocks as ContentBlock[]) || []
                }
                ctaConfig={offer.landing_page.cta_config}
              />

              {/* Footer */}
              <div className="border-t border-zinc-800/30 p-6 text-center">
                <p className="text-xs text-zinc-500 mb-1">
                  Powered by <span className="text-zinc-400 font-medium">Zen México</span>
                </p>
                <p className="text-xs text-zinc-600">
                  © {new Date().getFullYear()} Todos los derechos reservados
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  } catch (error) {
    console.error("[PublicOfferPage] Error:", error);
    notFound();
  }
}

/**
 * Generar metadata para SEO
 */
export async function generateMetadata({
  params,
}: PublicOfferPageProps): Promise<Metadata> {
  const { slug, offerId } = await params;

  try {
    const offerResult = await getPublicOffer(offerId, slug);

    if (!offerResult.success || !offerResult.data) {
      return {
        title: "Oferta no encontrada",
        description: "La oferta solicitada no está disponible",
      };
    }

    const offer = offerResult.data;
    const title = offer.name;
    const description =
      offer.description ||
      `Oferta especial de ${offer.objective === "presencial" ? "cita presencial" : "cita virtual"}`;

    return {
      title,
      description,
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
