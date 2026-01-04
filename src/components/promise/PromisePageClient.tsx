'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Calendar, Building2 } from 'lucide-react';
import { PromiseHeroSection } from './PromiseHeroSection';
import { CotizacionesSectionRealtime } from './CotizacionesSectionRealtime';
import { PaquetesSection } from './PaquetesSection';
import { ComparadorButton } from './ComparadorButton';
import { PortafoliosCard } from './PortafoliosCard';
import { PublicPageFooter } from '@/components/shared/PublicPageFooter';
import { PublicQuoteAuthorizedView } from './PublicQuoteAuthorizedView';
import { BankInfoModal } from '@/components/shared/BankInfoModal';
import { usePromiseSettingsRealtime } from '@/hooks/usePromiseSettingsRealtime';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { obtenerInfoBancariaStudio } from '@/lib/actions/cliente/pagos.actions';
import type { PublicCotizacion, PublicPaquete } from '@/types/public-promise';

interface PromiseShareSettings {
  show_packages: boolean;
  show_categories_subtotals: boolean;
  show_items_prices: boolean;
  min_days_to_hire: number;
  show_standard_conditions: boolean;
  show_offer_conditions: boolean;
  portafolios: boolean;
}

interface PromisePageClientProps {
  promise: {
    id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    contact_address: string | null;
    event_type_id: string | null;
    event_type_name: string | null;
    event_date: Date | null;
    event_location: string | null;
    event_name: string | null;
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
  };
  cotizaciones: PublicCotizacion[];
  paquetes: PublicPaquete[];
  condiciones_comerciales?: Array<{
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
    discount_percentage: number | null;
    type?: string;
    metodos_pago: Array<{
      id: string;
      metodo_pago_id: string;
      metodo_pago_name: string;
    }>;
  }>;
  terminos_condiciones?: Array<{
    id: string;
    title: string;
    content: string;
    is_required: boolean;
  }>;
  share_settings: PromiseShareSettings;
  portafolios?: Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    cover_image_url: string | null;
    event_type?: {
      id: string;
      name: string;
    } | null;
  }>;
  studioSlug: string;
  promiseId: string;
}

export function PromisePageClient({
  promise,
  studio,
  cotizaciones: initialCotizaciones,
  paquetes,
  condiciones_comerciales,
  terminos_condiciones,
  share_settings: initialShareSettings,
  portafolios,
  studioSlug,
  promiseId,
}: PromisePageClientProps) {
  const [shareSettings, setShareSettings] = useState<PromiseShareSettings>(initialShareSettings);
  const [cotizaciones, setCotizaciones] = useState<PublicCotizacion[]>(initialCotizaciones);
  const [showBankInfoModal, setShowBankInfoModal] = useState(false);
  const [bankInfo, setBankInfo] = useState<{ banco?: string | null; titular?: string | null; clabe?: string | null } | null>(null);
  const [loadingBankInfo, setLoadingBankInfo] = useState(false);

  const handleSettingsUpdated = useCallback((settings: PromiseShareSettings) => {
    setShareSettings(settings);
  }, []);

  const handleShowBankInfo = useCallback(async () => {
    if (bankInfo) {
      setShowBankInfoModal(true);
      return;
    }

    setLoadingBankInfo(true);
    try {
      const result = await obtenerInfoBancariaStudio(studio.id);
      if (result.success && result.data) {
        setBankInfo({
          banco: result.data.banco,
          titular: result.data.titular,
          clabe: result.data.clabe,
        });
        setShowBankInfoModal(true);
      }
    } catch (error) {
      console.error('[PromisePageClient] Error loading bank info:', error);
    } finally {
      setLoadingBankInfo(false);
    }
  }, [studio.id, bankInfo]);

  // Sincronizar cotizaciones cuando cambian las iniciales (SSR)
  useEffect(() => {
    setCotizaciones(initialCotizaciones);
  }, [initialCotizaciones]);

  // Función para recargar cotizaciones cuando hay cambios en tiempo real
  const reloadCotizaciones = useCallback(async () => {
    try {
      const result = await getPublicPromiseData(studioSlug, promiseId);
      if (result.success && result.data?.cotizaciones) {
        setCotizaciones(result.data.cotizaciones);
      }
    } catch (error) {
      console.error('[PromisePageClient] Error en reloadCotizaciones:', error);
    }
  }, [studioSlug, promiseId]);

  // Escuchar cambios en tiempo real de cotizaciones
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionInserted: reloadCotizaciones,
    onCotizacionUpdated: reloadCotizaciones,
    onCotizacionDeleted: (cotizacionId) => {
      setCotizaciones((prev) => prev.filter((c) => c.id !== cotizacionId));
    },
  });

  usePromiseSettingsRealtime({
    studioSlug,
    promiseId,
    studioDefaults: {
      promise_share_default_show_packages: studio.promise_share_default_show_packages,
      promise_share_default_show_categories_subtotals: studio.promise_share_default_show_categories_subtotals,
      promise_share_default_show_items_prices: studio.promise_share_default_show_items_prices,
      promise_share_default_min_days_to_hire: studio.promise_share_default_min_days_to_hire,
      promise_share_default_show_standard_conditions: studio.promise_share_default_show_standard_conditions,
      promise_share_default_show_offer_conditions: studio.promise_share_default_show_offer_conditions,
      promise_share_default_portafolios: studio.promise_share_default_portafolios,
    },
    onSettingsUpdated: handleSettingsUpdated,
  });

  // Detectar si hay cotización autorizada (en_cierre, contract_generated, contract_signed)
  const cotizacionAutorizada = useMemo(() => {
    return cotizaciones.find(
      (cot) =>
        cot.selected_by_prospect &&
        (cot.status === 'en_cierre' ||
          cot.status === 'contract_generated' ||
          cot.status === 'contract_signed')
    );
  }, [cotizaciones]);

  // Filtrar condiciones comerciales según settings en tiempo real
  const condicionesFiltradas = useMemo(() => {
    if (!condiciones_comerciales || condiciones_comerciales.length === 0) {
      return undefined;
    }

    return condiciones_comerciales.filter((condicion) => {
      const tipo = condicion.type || 'standard';
      if (tipo === 'standard') {
        return shareSettings.show_standard_conditions;
      } else if (tipo === 'offer') {
        return shareSettings.show_offer_conditions;
      }
      return false;
    });
  }, [condiciones_comerciales, shareSettings.show_standard_conditions, shareSettings.show_offer_conditions]);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header fijo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {studio.logo_url && (
              <img
                src={studio.logo_url}
                alt={studio.studio_name}
                className="h-9 w-9 object-contain rounded-full"
              />
            )}
            <div>
              <h1 className="text-sm font-semibold text-white">
                {studio.studio_name}
              </h1>
              {studio.slogan && (
                <p className="text-[10px] text-zinc-400">
                  {studio.slogan}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShowBankInfo}
              disabled={loadingBankInfo}
              className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-zinc-700 hover:border-zinc-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cuenta CLABE</span>
            </button>
            <a
              href={`/${studioSlug}`}
              className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              Ver perfil
            </a>
          </div>
        </div>
      </header>

      {/* Contenido principal con padding-top para header */}
      <div className="pt-[65px]">
        {/* Hero Section */}
        <PromiseHeroSection
          contactName={promise.contact_name}
          eventTypeName={promise.event_type_name}
          eventDate={promise.event_date}
          studioName={studio.studio_name}
          studioLogoUrl={studio.logo_url}
        />

        {/* Si hay cotización autorizada, mostrar vista de cotización autorizada */}
        {cotizacionAutorizada ? (
          <PublicQuoteAuthorizedView
            cotizacion={cotizacionAutorizada}
            promiseId={promiseId}
            studioSlug={studioSlug}
            promise={{
              contact_name: promise.contact_name,
              contact_phone: promise.contact_phone,
              contact_email: promise.contact_email,
              contact_address: promise.contact_address,
              event_type_name: promise.event_type_name,
              event_date: promise.event_date,
              event_location: promise.event_location,
              event_name: promise.event_name || null,
            }}
            studio={{
              studio_name: studio.studio_name,
              representative_name: studio.representative_name,
              phone: studio.phone,
              email: studio.email,
              address: studio.address,
              id: studio.id,
            }}
            cotizacionPrice={cotizacionAutorizada.price}
            eventTypeId={promise.event_type_id}
          />
        ) : (
          <>
            {/* Fecha sugerida de contratación */}
            {shareSettings.min_days_to_hire && shareSettings.min_days_to_hire > 0 && promise.event_date && (
              <section className="py-4 px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-sm text-zinc-300">
                      Sugerimos contratar antes del {' '}
                      <span className="font-medium text-emerald-400">
                        {(() => {
                          const eventDate = new Date(promise.event_date);
                          const fechaSugerida = new Date(eventDate);
                          fechaSugerida.setDate(fechaSugerida.getDate() - shareSettings.min_days_to_hire);
                          return fechaSugerida.toLocaleDateString('es-MX', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          });
                        })()}
                      </span>
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Cotizaciones personalizadas */}
            {cotizaciones.length > 0 && (
              <CotizacionesSectionRealtime
                initialCotizaciones={cotizaciones}
                promiseId={promiseId}
                studioSlug={studioSlug}
                condicionesComerciales={condicionesFiltradas}
                terminosCondiciones={terminos_condiciones}
                showCategoriesSubtotals={shareSettings.show_categories_subtotals}
                showItemsPrices={shareSettings.show_items_prices}
                showStandardConditions={shareSettings.show_standard_conditions}
                showOfferConditions={shareSettings.show_offer_conditions}
                showPackages={shareSettings.show_packages}
                paquetes={paquetes}
              />
            )}

            {/* Paquetes disponibles */}
            {shareSettings.show_packages && paquetes.length > 0 && (
              <PaquetesSection
                paquetes={paquetes}
                promiseId={promiseId}
                studioSlug={studioSlug}
                showAsAlternative={initialCotizaciones.length > 0}
                condicionesComerciales={condicionesFiltradas}
                terminosCondiciones={terminos_condiciones}
                minDaysToHire={shareSettings.min_days_to_hire}
                showCategoriesSubtotals={shareSettings.show_categories_subtotals}
                showItemsPrices={shareSettings.show_items_prices}
                showStandardConditions={shareSettings.show_standard_conditions}
                showOfferConditions={shareSettings.show_offer_conditions}
                showPackages={shareSettings.show_packages}
                cotizaciones={initialCotizaciones}
              />
            )}

            {/* Portafolios disponibles */}
            {shareSettings.portafolios && portafolios && portafolios.length > 0 && (
              <PortafoliosCard
                portafolios={portafolios}
                studioSlug={studioSlug}
                studioId={studio.id}
              />
            )}

            {/* Comparador */}
            {(cotizaciones.length + (shareSettings.show_packages ? paquetes.length : 0) >= 2) && (
              <ComparadorButton
                cotizaciones={cotizaciones}
                paquetes={shareSettings.show_packages ? paquetes : []}
                promiseId={promiseId}
                studioSlug={studioSlug}
              />
            )}
          </>
        )}

        {/* Footer by Zen */}
        <PublicPageFooter />
      </div>

      {/* Modal de información bancaria */}
      {bankInfo && (
        <BankInfoModal
          isOpen={showBankInfoModal}
          onClose={() => setShowBankInfoModal(false)}
          bankInfo={bankInfo}
          studioName={studio.studio_name}
        />
      )}
    </div>
  );
}
