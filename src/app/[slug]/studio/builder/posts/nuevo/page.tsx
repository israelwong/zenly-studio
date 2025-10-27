import { PostEditorSimplified } from "../components/PostEditorSimplified";
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
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-zinc-100">Nuevo Post</h1>
                <p className="text-zinc-400">
                    Crea una nueva publicación para tu estudio
                </p>
            </div>

            {/* Editor */}
            <PostEditorSimplified
                studioSlug={slug}
                eventTypes={eventTypes}
                mode="create"
            />
        </div>
    );
}
