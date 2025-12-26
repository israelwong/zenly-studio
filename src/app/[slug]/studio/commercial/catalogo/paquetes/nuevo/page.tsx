import { Metadata } from 'next';
import { PaqueteEditor } from '../components/PaqueteEditor';

export const metadata: Metadata = {
  title: 'ZEN Studio - Nuevo Paquete',
  description: 'Crea un nuevo paquete de servicios',
};

interface NuevoPaquetePageProps {
    params: Promise<{
        slug: string;
    }>;
    searchParams: Promise<{
        eventTypeId?: string;
        returnTab?: string;
    }>;
}

export default async function NuevoPaquetePage({ params, searchParams }: NuevoPaquetePageProps) {
    const { slug } = await params;
    const { eventTypeId, returnTab } = await searchParams;

    return (
        <PaqueteEditor
            studioSlug={slug}
            mode="create"
            initialEventTypeId={eventTypeId}
            returnTab={returnTab}
        />
    );
}
