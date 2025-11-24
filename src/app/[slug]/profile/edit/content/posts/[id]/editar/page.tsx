import { PostEditor } from "../../components/PostEditor";
import { obtenerTiposEvento } from "@/lib/actions/studio/negocio/tipos-evento.actions";
import { getStudioPostById } from "@/lib/actions/studio/posts";
import { notFound } from "next/navigation";
import { PostFormData } from "@/lib/actions/schemas/post-schemas";

// Tipo para el post de la BD
type DatabasePost = NonNullable<Awaited<ReturnType<typeof getStudioPostById>>['data']>;

// Función para convertir post de BD a PostFormData
function convertDatabasePostToFormData(dbPost: DatabasePost): PostFormData {
    return {
        id: dbPost.id,
        title: dbPost.title,
        caption: dbPost.caption,
        media: dbPost.media || [], // Incluir media items con todos los campos del schema
        cover_index: dbPost.cover_index,
        event_type_id: dbPost.event_type_id,
        tags: dbPost.tags,
        is_featured: dbPost.is_featured,
        is_published: dbPost.is_published,
    };
}

interface EditarPostPageProps {
    params: Promise<{
        slug: string;
        id: string;
    }>;
}

export default async function EditarPostPage({ params }: EditarPostPageProps) {
    const { slug, id } = await params;

    // Obtener el post existente
    const postResult = await getStudioPostById(id);
    if (!postResult.success || !postResult.data) {
        notFound();
    }

    // Obtener tipos de evento para el select
    const eventTypesResult = await obtenerTiposEvento(slug);
    const eventTypes = eventTypesResult.success
        ? (eventTypesResult.data || []).map(et => ({ id: et.id, name: et.nombre }))
        : [];

    return (
        <PostEditor
            studioSlug={slug}
            eventTypes={eventTypes}
            mode="edit"
            post={convertDatabasePostToFormData(postResult.data)}
        />
    );
}
