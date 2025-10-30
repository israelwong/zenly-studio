import { PortfolioEditor } from "../components/PortfolioEditor";
import { obtenerTiposEvento } from "@/lib/actions/studio/negocio/tipos-evento.actions";

interface NuevoPortfolioPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export default async function NuevoPortfolioPage({ params }: NuevoPortfolioPageProps) {
    const { slug } = await params;

    // Obtener tipos de evento para el select
    const eventTypesResult = await obtenerTiposEvento(slug);
    const eventTypes = eventTypesResult.success
        ? (eventTypesResult.data || []).map(et => ({ id: et.id, name: et.nombre }))
        : [];

    return (
        <PortfolioEditor
            studioSlug={slug}
            eventTypes={eventTypes}
            mode="create"
        />
    );
}

