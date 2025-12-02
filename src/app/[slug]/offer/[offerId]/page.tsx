import { notFound } from "next/navigation";
import { getPublicOffer } from "@/lib/actions/studio/offers/offers.actions";
import { OfferLandingPage } from "@/components/offers/OfferLandingPage";
import { TrackingScripts } from "@/components/offers/TrackingScripts";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { ContentBlock } from "@/types/content-blocks";

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
    // Obtener oferta pública (usar offerId como slug temporalmente)
    // TODO: Cambiar a usar slug de oferta en URL si se prefiere
    const offerResult = await getPublicOffer(offerId, slug);

    if (!offerResult.success || !offerResult.data) {
      console.error(
        "[PublicOfferPage] Error obteniendo oferta:",
        offerResult.error
      );
      notFound();
    }

    const offer = offerResult.data;

    // Obtener datos del estudio para tracking (solo campos de tracking)
    const studio = await prisma.studios.findUnique({
      where: { slug },
      select: {
        gtm_id: true,
        facebook_pixel_id: true,
        zen_pixel_id: true,
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
          zenPixelId={studio?.zen_pixel_id || undefined}
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

        {/* Landing page */}
        <OfferLandingPage
          studioSlug={slug}
          offerId={offer.id}
          offerSlug={offer.slug}
          contentBlocks={
            (offer.landing_page.content_blocks as ContentBlock[]) || []
          }
          ctaConfig={offer.landing_page.cta_config}
        />
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
