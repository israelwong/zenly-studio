import { PaqueteEditor } from '../../components/PaqueteEditor';

interface NuevoPaquetePageProps {
    params: Promise<{
        slug: string;
    }>;
}

export default async function NuevoPaquetePage({ params }: NuevoPaquetePageProps) {
    const { slug } = await params;

    return (
        <PaqueteEditor
            studioSlug={slug}
            mode="create"
        />
    );
}
