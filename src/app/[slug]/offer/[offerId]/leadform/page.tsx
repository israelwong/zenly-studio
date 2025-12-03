import { notFound } from "next/navigation";
import { getPublicOffer } from "@/lib/actions/studio/offers/offers.actions";
import { OfferLeadForm } from "@/components/offers/OfferLeadForm";
import { TrackingScripts } from "@/components/offers/TrackingScripts";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";

interface PublicOfferLeadFormPageProps {
  params: Promise<{ slug: string; offerId: string }>;
}

/**
 * Página pública de leadform para oferta comercial
 */
export default async function PublicOfferLeadFormPage({
  params,
}: PublicOfferLeadFormPageProps) {
  const { slug, offerId } = await params;

  try {
    // Obtener oferta pública (usar offerId como slug temporalmente)
    // TODO: Cambiar a usar slug de oferta en URL si se prefiere
    const offerResult = await getPublicOffer(offerId, slug);

    if (!offerResult.success || !offerResult.data) {
      console.error(
        "[PublicOfferLeadFormPage] Error obteniendo oferta:",
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
      },
    });

    // Verificar que tenga leadform
    if (!offer.leadform) {
      console.error("[PublicOfferLeadFormPage] Oferta sin leadform configurado");
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
              eventName: "offer_leadform_view",
              eventData: {
                offer_id: offer.id,
                offer_slug: offer.slug,
                offer_name: offer.name,
              },
            },
            {
              eventName: "ViewContent",
              eventData: {
                content_name: `${offer.slug}_leadform`,
                content_category: "leadform",
              },
            },
          ]}
        />

        {/* Leadform */}
        <OfferLeadForm
          studioSlug={slug}
          studioId={offer.studio_id}
          offerId={offer.id}
          offerSlug={offer.slug}
          title={offer.leadform.title}
          description={offer.leadform.description}
          successMessage={offer.leadform.success_message}
          successRedirectUrl={offer.leadform.success_redirect_url || undefined}
          fieldsConfig={offer.leadform.fields_config}
          selectedEventTypeIds={offer.leadform.selected_event_type_ids}
          enableInterestDate={offer.leadform.enable_interest_date}
          validateWithCalendar={offer.leadform.validate_with_calendar}
          emailRequired={offer.leadform.email_required}
          coverUrl={offer.cover_media_url}
          coverType={offer.cover_media_type}
        />
      </>
    );
  } catch (error) {
    console.error("[PublicOfferLeadFormPage] Error:", error);
    notFound();
  }
}

/**
 * Generar metadata para SEO
 */
export async function generateMetadata({
  params,
}: PublicOfferLeadFormPageProps): Promise<Metadata> {
  const { slug, offerId } = await params;

  try {
    const offerResult = await getPublicOffer(offerId, slug);

    if (!offerResult.success || !offerResult.data) {
      return {
        title: "Formulario no encontrado",
        description: "El formulario solicitado no está disponible",
      };
    }

    const offer = offerResult.data;
    const title = offer.leadform?.title || `Solicita información - ${offer.name}`;
    const description =
      offer.leadform?.description ||
      `Completa el formulario para obtener más información sobre ${offer.name}`;

    return {
      title,
      description,
      robots: {
        index: false, // No indexar formularios
        follow: false,
      },
    };
  } catch (error) {
    console.error("[generateMetadata] Error:", error);
    return {
      title: "Formulario no encontrado",
      description: "El formulario solicitado no está disponible",
    };
  }
}
