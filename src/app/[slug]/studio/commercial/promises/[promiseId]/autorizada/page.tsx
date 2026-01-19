import { getCotizacionAutorizadaByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { PromiseAutorizadaClient } from './components/PromiseAutorizadaClient';

interface PromiseAutorizadaPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PromiseAutorizadaPage({ params }: PromiseAutorizadaPageProps) {
  const { slug: studioSlug, promiseId } = await params;

  // Cargar cotización autorizada en el servidor
  const autorizadaResult = await getCotizacionAutorizadaByPromiseId(promiseId);

  const cotizacionAutorizada = autorizadaResult.success && autorizadaResult.data
    ? autorizadaResult.data
    : null;

  return (
    <PromiseAutorizadaClient
      initialCotizacionAutorizada={cotizacionAutorizada}
    />
  );
}
