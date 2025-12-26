import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPublicOffer } from "@/lib/actions/studio/offers/offers.actions";
import { OfferLandingPage } from "@/components/offers/OfferLandingPage";
import { TrackingScripts } from "@/components/offers/TrackingScripts";
import { OfferBackgroundWrapper } from "@/components/offers/OfferBackgroundWrapper";
import { OfferHeader } from "@/components/offers/OfferHeader";
import { PublicPageFooter } from "@/components/shared/PublicPageFooter";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { ContentBlock } from "@/types/content-blocks";
import { PackageX } from "lucide-react";

interface PublicOfferPageProps {
  params: Promise<{ slug: string; offerId: string }>;
  searchParams: Promise<{ preview?: string }>;
}

/**
 * Landing page pública de oferta comercial
 */
export default async function PublicOfferPage({
  params,
  searchParams,
}: PublicOfferPageProps) {
  const { slug, offerId } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "true";

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

        {/* Wrapper con fondo glassmorphism */}
        <OfferBackgroundWrapper coverUrl={offer.cover_media_url}>
          <div className="min-h-screen relative">

            {/* Header sticky fixed en top */}
            <OfferHeader
              studioSlug={slug}
              studioName={studio?.studio_name}
              studioSlogan={studio?.slogan}
              logoUrl={studio?.logo_url}
            />

            {/* Container mobile centrado con padding-top para header */}
            <div className="max-w-md mx-auto min-h-screen pt-[81px] px-4 md:px-0 md:py-24">
              {/* Wrapper con scroll y glassmorphism */}
              <div className="min-h-[calc(100vh-81px)] bg-zinc-950/50 backdrop-blur-md rounded-xl mb-4 md:mb-0 overflow-hidden">
                {/* Content */}
                <OfferLandingPage
                  studioSlug={slug}
                  offerId={offer.id}
                  offerSlug={offer.slug}
                  contentBlocks={
                    (offer.landing_page.content_blocks as ContentBlock[]) || []
                  }
                  ctaConfig={offer.landing_page.cta_config}
                  leadformData={
                    offer.leadform
                      ? {
                        studioId: offer.studio_id,
                        title: offer.leadform.title,
                        description: offer.leadform.description,
                        successMessage: offer.leadform.success_message,
                        successRedirectUrl: offer.leadform.success_redirect_url,
                        fieldsConfig: offer.leadform.fields_config,
                        eventTypeId: offer.leadform.event_type_id,
                        enableInterestDate: offer.leadform.enable_interest_date,
                        validateWithCalendar: offer.leadform.validate_with_calendar,
                        emailRequired: offer.leadform.email_required,
                        coverUrl: null,
                        coverType: null,
                      }
                      : undefined
                  }
                />

                {/* Footer */}
                <PublicPageFooter />
              </div>
            </div>
          </div>
        </OfferBackgroundWrapper>
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
    
    // Obtener información completa del estudio
    const studio = await prisma.studios.findUnique({
      where: { slug },
      select: { studio_name: true, logo_url: true },
    });

    const title = studio?.studio_name 
      ? `${offer.name} - ${studio.studio_name}`
      : offer.name;
    const description =
      offer.description ||
      (studio?.studio_name 
        ? `Oferta especial de ${studio.studio_name}`
        : `Oferta especial`);

    // Configurar favicon dinámico usando el logo del studio
    const icons = studio?.logo_url ? {
      icon: [
        { url: studio.logo_url, type: 'image/png' },
        { url: studio.logo_url, sizes: '32x32', type: 'image/png' },
        { url: studio.logo_url, sizes: '16x16', type: 'image/png' },
      ],
      apple: [
        { url: studio.logo_url, sizes: '180x180', type: 'image/png' },
      ],
      shortcut: studio.logo_url,
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
