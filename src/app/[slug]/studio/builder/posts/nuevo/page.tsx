import { PostEditor } from "../components/PostEditor";
import { obtenerTiposEvento } from "@/lib/actions/studio/negocio/tipos-evento.actions";

interface NuevoPostPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export default async function NuevoPostPage({ params }: NuevoPostPageProps) {
    const { slug } = await params;

    // Obtener tipos de evento para el select
    const eventTypesResult = await obtenerTiposEvento(slug);
    const eventTypes = eventTypesResult.success
        ? (eventTypesResult.data || []).map(et => ({ id: et.id, name: et.nombre }))
        : [];

    return (
        <PostEditor
            studioSlug={slug}
            eventTypes={eventTypes}
            mode="create"
        />
    );
}
