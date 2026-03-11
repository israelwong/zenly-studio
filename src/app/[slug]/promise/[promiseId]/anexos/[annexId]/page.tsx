import { notFound } from 'next/navigation';
import { getPublicAnnexCotizacion } from '@/lib/actions/public/promesas.actions';
import { getPublicPromiseBasicData } from '@/lib/actions/public/promesas.actions';
import { getPublicPromisePath } from '@/lib/utils/public-promise-routing';
import { AnexoPublicPageClient } from './AnexoPublicPageClient';

export const dynamic = 'force-dynamic';

interface AnexoPageProps {
  params: Promise<{ slug: string; promiseId: string; annexId: string }>;
}

export default async function AnexoPublicPage({ params }: AnexoPageProps) {
  const { slug, promiseId, annexId } = await params;

  const [annexResult, basicResult] = await Promise.all([
    getPublicAnnexCotizacion(slug, promiseId, annexId),
    getPublicPromiseBasicData(slug, promiseId),
  ]);

  if (!annexResult.success || !annexResult.data) {
    notFound();
  }

  if (!basicResult.success || !basicResult.data) {
    notFound();
  }

  const visibleToClient = annexResult.visibleToClient !== false;
  const { promise: promiseRaw, studio: studioBasic } = basicResult.data;
  const shareSettings = {
    show_categories_subtotals: promiseRaw.share_show_categories_subtotals ?? studioBasic.promise_share_default_show_categories_subtotals,
    show_items_prices: promiseRaw.share_show_items_prices ?? studioBasic.promise_share_default_show_items_prices,
    show_standard_conditions: promiseRaw.share_show_standard_conditions ?? studioBasic.promise_share_default_show_standard_conditions,
    show_offer_conditions: promiseRaw.share_show_offer_conditions ?? studioBasic.promise_share_default_show_offer_conditions,
    show_packages: false,
    auto_generate_contract: false,
    allow_online_authorization: false,
  };

  const promiseData = {
    contact_name: promiseRaw.contact_name,
    contact_phone: promiseRaw.contact_phone,
    contact_email: promiseRaw.contact_email ?? '',
    contact_address: promiseRaw.contact_address ?? '',
    event_name: promiseRaw.event_name ?? '',
    event_location: promiseRaw.event_location ?? '',
    event_date: promiseRaw.event_date ?? null,
    event_type_name: promiseRaw.event_type_name ?? null,
  };

  return (
    <AnexoPublicPageClient
      studioSlug={slug}
      promiseId={promiseId}
      studioId={studioBasic.id}
      studioName={studioBasic.studio_name}
      logoUrl={studioBasic.logo_url}
      annexCotizacion={annexResult.data}
      visibleToClient={visibleToClient}
      shareSettings={shareSettings}
      promiseData={promiseData}
      backHref={getPublicPromisePath(slug, promiseId)}
    />
  );
}
