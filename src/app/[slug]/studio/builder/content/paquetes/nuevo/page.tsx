import { PaqueteEditor } from '../components/PaqueteEditor';

interface NuevoPaquetePageProps {
    params: Promise<{
        slug: string;
    }>;
    searchParams: Promise<{
        eventTypeId?: string;
    }>;
}

export default async function NuevoPaquetePage({ params, searchParams }: NuevoPaquetePageProps) {
    const { slug } = await params;
    const { eventTypeId } = await searchParams;

    return (
        <PaqueteEditor
            studioSlug={slug}
            mode="create"
            initialEventTypeId={eventTypeId}
        />
    );
}
