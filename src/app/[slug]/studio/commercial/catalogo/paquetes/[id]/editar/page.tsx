import { PaqueteEditor } from '../../components/PaqueteEditor';
import { obtenerPaquetePorId } from '@/lib/actions/studio/paquetes/paquetes.actions';
import { notFound } from 'next/navigation';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

interface EditarPaquetePageProps {
    params: Promise<{
        slug: string;
        id: string;
    }>;
    searchParams: Promise<{
        returnTab?: string;
    }>;
}

export default async function EditarPaquetePage({ params, searchParams }: EditarPaquetePageProps) {
    const { slug, id } = await params;
    const { returnTab } = await searchParams;

    // Obtener el paquete existente
    const paqueteResult = await obtenerPaquetePorId(id);

    if (!paqueteResult.success || !paqueteResult.data) {
        notFound();
    }

    const paquete = paqueteResult.data as PaqueteFromDB;

    return (
        <PaqueteEditor
            studioSlug={slug}
            mode="edit"
            paquete={paquete}
            returnTab={returnTab}
        />
    );
}
