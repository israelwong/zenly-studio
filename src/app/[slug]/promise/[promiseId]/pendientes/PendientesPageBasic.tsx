import { CalendarX2 } from 'lucide-react';
import { PublicPromisePageHeader } from '@/components/promise/PublicPromisePageHeader';
import { PromiseRouteSync } from '@/components/promise/PromiseRouteSync';

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
  /** true cuando la fecha del evento ya alcanzó max_events_per_day (mostrar Agotado) */
  dateSoldOut?: boolean;
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
  dateSoldOut = false,
}: PendientesPageBasicProps) {
  return (
    <>
      <PromiseRouteSync studioSlug={studioSlug} promiseId={promiseId} />
      {dateSoldOut && (
        <div className="mx-4 mt-6 max-w-2xl rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-8 flex flex-col items-center gap-4 text-center">
          <div className="p-3 rounded-full bg-amber-500/10">
            <CalendarX2 className="h-8 w-8 text-amber-400" />
          </div>
          <p className="text-base md:text-lg text-zinc-200 leading-relaxed">
            Lo sentimos, la fecha que buscas ya ha sido reservada por otro cliente. Agradecemos tu preferencia y esperamos poder trabajar contigo más adelante. ¡Mil gracias por la comprensión!
          </p>
        </div>
      )}
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
