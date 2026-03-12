import { NuevaCotizacionClient } from './components/NuevaCotizacionClient';

interface NuevaCotizacionPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
  searchParams: Promise<{
    paqueteId?: string;
    contactId?: string;
    isAnnex?: string;
    parentId?: string;
    /** URL a la que redirigir tras guardar (ej. ficha del evento). */
    returnUrl?: string;
  }>;
}

export default async function NuevaCotizacionPage({ params, searchParams }: NuevaCotizacionPageProps) {
  const { slug: studioSlug, promiseId } = await params;
  const search = await searchParams;
  const packageId = search.paqueteId || null;
  const contactId = search.contactId || null;
  const isAnnex = search.isAnnex === 'true';
  const parentId = search.parentId ?? null;
  const returnUrl = search.returnUrl ?? null;

  return (
    <NuevaCotizacionClient
      studioSlug={studioSlug}
      promiseId={promiseId}
      packageId={packageId}
      contactId={contactId}
      isAnnex={isAnnex}
      parentCotizacionId={parentId}
      returnUrl={returnUrl}
    />
  );
}

