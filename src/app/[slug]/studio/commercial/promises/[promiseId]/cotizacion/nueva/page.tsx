import { NuevaCotizacionClient } from './components/NuevaCotizacionClient';

interface NuevaCotizacionPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
  searchParams: Promise<{
    paqueteId?: string;
    contactId?: string;
  }>;
}

export default async function NuevaCotizacionPage({ params, searchParams }: NuevaCotizacionPageProps) {
  const { slug: studioSlug, promiseId } = await params;
  const search = await searchParams;
  const packageId = search.paqueteId || null;
  const contactId = search.contactId || null;

  return (
    <NuevaCotizacionClient
      studioSlug={studioSlug}
      promiseId={promiseId}
      packageId={packageId}
      contactId={contactId}
    />
  );
}

