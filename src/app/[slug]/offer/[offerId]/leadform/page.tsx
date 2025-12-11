import { notFound } from "next/navigation";
import Image from "next/image";
import { getPublicOffer } from "@/lib/actions/studio/offers/offers.actions";
import { OfferLeadForm } from "@/components/offers/OfferLeadForm";
import { TrackingScripts } from "@/components/offers/TrackingScripts";
import { OfferHeader } from "@/components/offers/OfferHeader";
import { prisma } from "@/lib/prisma";
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
          <OfferHeader
            studioSlug={slug}
            studioName={studio?.studio_name}
            studioSlogan={studio?.slogan}
            logoUrl={studio?.logo_url}
          />

          {/* Container mobile centrado con padding-top para header */}
          <div className="max-w-md mx-auto pt-[100px] pb-8 px-4 md:px-0 md:py-24">
            {/* Wrapper con scroll y glassmorphism */}
            <div className="bg-zinc-950/50 backdrop-blur-md rounded-xl overflow-hidden">
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
                eventTypeId={offer.leadform.event_type_id || null}
                enableInterestDate={offer.leadform.enable_interest_date}
                validateWithCalendar={offer.leadform.validate_with_calendar}
                emailRequired={offer.leadform.email_required}
                coverUrl={offer.cover_media_url}
                coverType={offer.cover_media_type}
              />

              {/* Footer */}
              <div className="border-t border-zinc-800/30 p-6 text-center">
                <p className="text-xs text-zinc-500 mb-1">
                  Powered by <Link href="/" className="text-zinc-400 font-medium hover:text-zinc-300 transition-colors">Zen México</Link>
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
