import { PublicPromisePageHeader } from '@/components/promise/PublicPromisePageHeader';
import { PromiseRedirectWrapper } from '@/components/promise/PromiseRedirectWrapper';

interface CierrePageBasicProps {
  promise: {
    id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    contact_address: string | null;
    event_type_id: string | null;
    event_type_name: string | null;
    event_type_cover_image_url?: string | null;
    event_type_cover_video_url?: string | null;
    event_type_cover_media_type?: 'image' | 'video' | null;
    event_type_cover_design_variant?: 'solid' | 'gradient' | null;
    event_name: string | null;
    event_date: Date | null;
    event_location: string | null;
  };
  studio: {
    studio_name: string;
    slogan: string | null;
    logo_url: string | null;
    id: string;
    representative_name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  totalPrice: number;
  studioSlug: string;
  promiseId: string;
}

/**
 * ⚠️ STREAMING: Componente básico (instantáneo)
 * Renderiza datos básicos de promise + studio + precio total sin esperar datos pesados
 */
export function CierrePageBasic({
  promise,
  studio,
  totalPrice,
  studioSlug,
  promiseId,
}: CierrePageBasicProps) {
  return (
    <>
      <PromiseRedirectWrapper studioSlug={studioSlug} promiseId={promiseId} />
      <PublicPromisePageHeader
        prospectName={promise.contact_name}
        eventName={promise.event_name}
        eventTypeName={promise.event_type_name}
        eventDate={promise.event_date}
        variant="cierre"
        isContractSigned={false}
        coverImageUrl={promise.event_type_cover_image_url}
        coverVideoUrl={promise.event_type_cover_video_url}
        coverMediaType={promise.event_type_cover_media_type}
        coverDesignVariant={promise.event_type_cover_design_variant}
      />
      {/* ⚠️ HIGIENE UI: No mostrar precio total aquí, PublicQuoteAuthorizedView lo muestra con lógica completa */}
      {/* Nota: isContractSigned se actualizará dinámicamente en PublicQuoteAuthorizedView */}
    </>
  );
}
