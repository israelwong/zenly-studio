export default async function AdminEstudioDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <div>
            <h1>Detalle del Estudio</h1>
            <p>ID: {id}</p>
        </div>
    );
}
