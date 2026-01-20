import { PromiseHeroSection } from '@/components/promise/PromiseHeroSection';
import { PromiseRedirectWrapper } from '@/components/promise/PromiseRedirectWrapper';

interface NegociacionPageBasicProps {
  promise: {
    id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    contact_address: string | null;
    event_type_id: string | null;
    event_type_name: string | null;
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
export function NegociacionPageBasic({
  promise,
  studio,
  totalPrice,
  studioSlug,
  promiseId,
}: NegociacionPageBasicProps) {
  return (
    <>
      <PromiseRedirectWrapper studioSlug={studioSlug} promiseId={promiseId} />
      <PromiseHeroSection
        contactName={promise.contact_name}
        eventTypeName={promise.event_type_name}
        eventDate={promise.event_date}
        studioName={studio.studio_name}
        studioLogoUrl={studio.logo_url}
      />
      {/* Mostrar precio total inmediatamente */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 text-center">
          <p className="text-sm text-zinc-400 mb-2">Precio Total</p>
          <p className="text-3xl font-bold text-white">
            {new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(totalPrice)}
          </p>
        </div>
      </div>
    </>
  );
}
