import { PublicPromisePageHeader } from '@/components/promise/PublicPromisePageHeader';
import { PromiseRedirectWrapper } from '@/components/promise/PromiseRedirectWrapper';

interface PendientesPageBasicProps {
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
    promise_share_default_show_packages: boolean;
    promise_share_default_show_categories_subtotals: boolean;
    promise_share_default_show_items_prices: boolean;
    promise_share_default_min_days_to_hire: number;
    promise_share_default_show_standard_conditions: boolean;
    promise_share_default_show_offer_conditions: boolean;
    promise_share_default_portafolios: boolean;
    promise_share_default_auto_generate_contract: boolean;
  };
  studioSlug: string;
  promiseId: string;
}

/**
 * ⚠️ STREAMING: Componente básico (instantáneo)
 * Renderiza datos básicos de promise + studio sin esperar datos pesados
 */
export function PendientesPageBasic({
  promise,
  studio,
  studioSlug,
  promiseId,
}: PendientesPageBasicProps) {
  return (
    <>
      <PromiseRedirectWrapper studioSlug={studioSlug} promiseId={promiseId} />
      <PublicPromisePageHeader
        prospectName={promise.contact_name}
        eventName={promise.event_name}
        eventTypeName={promise.event_type_name}
        eventDate={promise.event_date}
        variant="pendientes"
        minDaysToHire={studio.promise_share_default_min_days_to_hire}
        coverImageUrl={promise.event_type_cover_image_url}
        coverVideoUrl={promise.event_type_cover_video_url}
        coverMediaType={promise.event_type_cover_media_type}
        coverDesignVariant={promise.event_type_cover_design_variant}
      />
    </>
  );
}
