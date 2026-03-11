'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Loader2, LayoutDashboard } from 'lucide-react';
import { ZenButton, ZenCard, ZenCardContent } from '@/components/ui/zen';
import { CotizacionesSectionRealtime } from '@/components/promise/CotizacionesSectionRealtime';
import { PromiseProfileLink } from '@/components/promise/PromiseProfileLink';
import { confirmarAnexoPublica } from '@/lib/actions/public/cotizaciones.actions';
import { getPublicPromisePath } from '@/lib/utils/public-promise-routing';
import type { PublicCotizacion } from '@/types/public-promise';

interface AnexoPublicPageClientProps {
  studioSlug: string;
  promiseId: string;
  studioId: string;
  studioName: string;
  logoUrl: string | null;
  annexCotizacion: PublicCotizacion & { visibleToClient?: boolean };
  visibleToClient: boolean;
  shareSettings: {
    show_categories_subtotals: boolean;
    show_items_prices: boolean;
    show_standard_conditions: boolean;
    show_offer_conditions: boolean;
    show_packages: boolean;
    auto_generate_contract: boolean;
    allow_online_authorization: boolean;
  };
  promiseData: {
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    contact_address: string;
    event_name: string;
    event_location: string;
    event_date: Date | null;
    event_type_name: string | null;
  };
  backHref: string;
}

function AnnexPreparingView({ message }: { message: string }) {
  return (
    <ZenCard className="border-amber-500/30 bg-amber-500/5">
      <ZenCardContent className="py-8 px-6 text-center">
        <p className="text-amber-200/90 text-sm leading-relaxed">{message}</p>
      </ZenCardContent>
    </ZenCard>
  );
}

export function AnexoPublicPageClient({
  studioSlug,
  promiseId,
  studioId,
  studioName,
  logoUrl,
  annexCotizacion,
  visibleToClient,
  shareSettings,
  promiseData,
  backHref,
}: AnexoPublicPageClientProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const panelHref = getPublicPromisePath(studioSlug, promiseId);

  const handleConfirmarPropuesta = async () => {
    setIsConfirming(true);
    try {
      const result = await confirmarAnexoPublica(studioSlug, promiseId, annexCotizacion.id);
      if (result.success) {
        setShowConfirmDialog(false);
        setConfirmed(true);
      } else {
        setShowConfirmDialog(false);
        throw new Error(result.error);
      }
    } catch (e) {
      console.error('[AnexoPublic] confirmarAnexoPublica:', e);
      setShowConfirmDialog(false);
      alert((e instanceof Error ? e.message : 'Error al confirmar. Intenta de nuevo.') as string);
    } finally {
      setIsConfirming(false);
    }
  };

  const isAutorizada =
    (annexCotizacion as { status?: string }).status === 'autorizada' ||
    (annexCotizacion as { status?: string }).status === 'aprobada' ||
    (annexCotizacion as { status?: string }).status === 'approved';

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={backHref}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
            aria-label="Volver a tu propuesta"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <PromiseProfileLink
            href={`/${studioSlug}`}
            className="flex flex-1 items-center gap-3 min-w-0"
          >
            {logoUrl && (
              <img
                src={logoUrl}
                alt={studioName}
                className="w-8 h-8 rounded object-contain shrink-0"
              />
            )}
            <span className="font-medium text-zinc-200 truncate">{studioName}</span>
          </PromiseProfileLink>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {!visibleToClient ? (
          <AnnexPreparingView message="Estamos preparando los detalles de tu propuesta adicional. Te avisaremos cuando esté lista." />
        ) : confirmed ? (
          <ZenCard className="border-emerald-500/30 bg-emerald-500/5">
            <ZenCardContent className="py-10 px-6 text-center space-y-6">
              <CheckCircle className="h-14 w-14 text-emerald-400 mx-auto" />
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">¡Confirmación recibida!</h2>
                <p className="text-sm text-zinc-300">
                  El anexo ha sido integrado a tu evento. Puedes consultarlo en tu panel de seguimiento.
                </p>
              </div>
              <ZenButton asChild size="lg" className="gap-2">
                <Link href={panelHref}>
                  <LayoutDashboard className="h-5 w-5" />
                  Ir a mi Panel de Cliente
                </Link>
              </ZenButton>
            </ZenCardContent>
          </ZenCard>
        ) : (
          <>
            <div className="mb-4">
              <h1 className="text-lg font-semibold text-zinc-100">{annexCotizacion.name}</h1>
              {annexCotizacion.description && (
                <p className="text-sm text-zinc-500 mt-1">{annexCotizacion.description}</p>
              )}
            </div>

            <CotizacionesSectionRealtime
              initialCotizaciones={[{ ...annexCotizacion, is_annex: true }]}
              promiseId={promiseId}
              studioSlug={studioSlug}
              studioId={studioId}
              condicionesComerciales={[]}
              terminosCondiciones={[]}
              showCategoriesSubtotals={shareSettings.show_categories_subtotals}
              showItemsPrices={shareSettings.show_items_prices}
              showStandardConditions={shareSettings.show_standard_conditions}
              showOfferConditions={shareSettings.show_offer_conditions}
              showPackages={shareSettings.show_packages}
              paquetes={[]}
              autoGenerateContract={shareSettings.auto_generate_contract}
              mostrarBotonAutorizar={false}
              promiseData={promiseData}
            />

            {!isAutorizada && (
              <div className="mt-6">
                <ZenButton
                  size="lg"
                  className="w-full gap-2"
                  onClick={() => setShowConfirmDialog(true)}
                >
                  <CheckCircle className="h-5 w-5" />
                  Confirmar Propuesta
                </ZenButton>
              </div>
            )}
          </>
        )}
      </main>

      {/* Diálogo de confirmación */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <ZenCard className="w-full max-w-md border-zinc-700">
            <ZenCardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">Confirmar propuesta adicional</h3>
              <p className="text-sm text-zinc-400">
                ¿Confirmar propuesta adicional? Estás a punto de aceptar este anexo, el cual se sumará al presupuesto y cronograma de tu evento.
              </p>
              <div className="flex gap-3 pt-2">
                <ZenButton
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isConfirming}
                >
                  Cancelar
                </ZenButton>
                <ZenButton
                  className="flex-1 gap-2"
                  onClick={handleConfirmarPropuesta}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    'Confirmar'
                  )}
                </ZenButton>
              </div>
            </ZenCardContent>
          </ZenCard>
        </div>
      )}
    </div>
  );
}
