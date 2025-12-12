export default async function ClientePagos({
    params
}: {
    params: Promise<{ slug: string; 'event-id': string }>
}) {
    const { slug, 'event-id': eventId } = await params;
    return (
        <div>
            <h1>Pagos del Evento - {slug}</h1>
            <p>Evento ID: {eventId}</p>
        </div>
    );
}
