import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicOfferBasicData } from "@/lib/actions/studio/offers/offers.actions";
import { OfferLeadForm } from "@/components/offers/OfferLeadForm";
import { TrackingScripts } from "@/components/offers/TrackingScripts";
import { OfferHeader } from "@/components/offers/OfferHeader";
import { OfferInfoCard } from "@/components/offers/OfferInfoCard";
import { PublicPageFooter } from "@/components/shared/PublicPageFooter";
import { Metadata } from "next";

interface PublicOfferLeadFormPageProps {
  params: Promise<{ slug: string; offerId: string }>;
  searchParams: Promise<{ preview?: string }>;
}

/**
 * Página pública de leadform para oferta comercial
 */
export default async function PublicOfferLeadFormPage({
  params,
  searchParams,
}: PublicOfferLeadFormPageProps) {
  const { slug, offerId } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "true";

  try {
    // ⚠️ STREAMING: Usar BasicData para carga instantánea (incluye event_type_name)
    const offerResult = await getPublicOfferBasicData(offerId, slug);

    if (!offerResult.success || !offerResult.data) {
      console.error(
        "[PublicOfferLeadFormPage] Error obteniendo oferta:",
        offerResult.error
      );
      notFound();
    }

    const { offer, studio: studioData } = offerResult.data;

    // Verificar que tenga leadform
    if (!offer.leadform) {
      console.error("[PublicOfferLeadFormPage] Oferta sin leadform configurado");
      notFound();
    }

    return (
      <>
        {/* Scripts de tracking */}
        <TrackingScripts
          gtmId={studioData?.gtm_id || undefined}
          facebookPixelId={studioData?.facebook_pixel_id || undefined}
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

        {/* Wrapper con fondo */}
        <div className="min-h-screen relative bg-zinc-950">
          {/* Header sticky fixed en top */}
          <OfferHeader
            studioSlug={slug}
            studioName={studioData?.studio_name}
            studioSlogan={studioData?.slogan}
            logoUrl={studioData?.logo_url}
          />

          {/* Container mobile centrado con padding-top para header */}
          <div className="max-w-md mx-auto min-h-screen pt-[94px] px-4 md:px-0 md:py-24">
            {/* Ficha informativa de la oferta - Mostrar siempre que haya datos disponibles */}
            {(offer.business_term || offer.has_date_range) && (
              <div className="mb-6">
                <OfferInfoCard
                  discountPercentage={offer.business_term?.discount_percentage ?? null}
                  advancePercentage={offer.business_term?.advance_percentage ?? null}
                  advanceType={offer.business_term?.advance_type ?? 'percentage'}
                  advanceAmount={offer.business_term?.advance_amount ?? null}
                  startDate={offer.start_date ?? null}
                  endDate={offer.end_date ?? null}
                  isPermanent={offer.is_permanent || false}
                  hasDateRange={offer.has_date_range || false}
                />
              </div>
            )}

            {/* Leadform con su propio fondo */}
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
              eventTypeId={offer.leadform.event_type_id || null}
              eventTypeName={offer.leadform.event_type_name || null}
              enableInterestDate={offer.leadform.enable_interest_date}
              validateWithCalendar={offer.leadform.validate_with_calendar}
              emailRequired={offer.leadform.email_required}
              enableEventName={offer.leadform.enable_event_name || false}
              eventNameRequired={offer.leadform.event_name_required || false}
              enableEventDuration={offer.leadform.enable_event_duration || false}
              eventDurationRequired={offer.leadform.event_duration_required || false}
              coverUrl={offer.cover_media_url}
              coverType={offer.cover_media_type}
              isPreview={isPreview}
              isModal={false}
              showPackagesAfterSubmit={offer.leadform.show_packages_after_submit || false}
            />

            {/* Footer */}
            <PublicPageFooter />
          </div>
        </div>
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
    const offerResult = await getPublicOfferBasicData(offerId, slug);

    if (!offerResult.success || !offerResult.data) {
      return {
        title: "Formulario no encontrado",
        description: "El formulario solicitado no está disponible",
      };
    }

    const { offer, studio: studioData } = offerResult.data;

    const baseTitle = offer.leadform?.title || `Solicita información - ${offer.name}`;
    const title = studioData?.studio_name 
      ? `${baseTitle} - ${studioData.studio_name}`
      : baseTitle;
    const description =
      offer.leadform?.description ||
      (studioData?.studio_name
        ? `Completa el formulario para obtener más información sobre ${offer.name} de ${studioData.studio_name}`
        : `Completa el formulario para obtener más información sobre ${offer.name}`);

    // Configurar favicon dinámico usando el logo del studio
    const icons = studioData?.logo_url ? {
      icon: [
        { url: studioData.logo_url, type: 'image/png' },
        { url: studioData.logo_url, sizes: '32x32', type: 'image/png' },
        { url: studioData.logo_url, sizes: '16x16', type: 'image/png' },
      ],
      apple: [
        { url: studioData.logo_url, sizes: '180x180', type: 'image/png' },
      ],
      shortcut: studioData.logo_url,
    } : undefined;

    return {
      title,
      description,
      icons, // ← Favicon dinámico
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
