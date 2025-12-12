export default async function ClienteEvento({
    params
}: {
    params: Promise<{ slug: string; 'event-id': string }>
}) {
    const { slug, 'event-id': eventId } = await params;
    return (
        <div>
            <h1>Evento del Cliente - {slug}</h1>
            <p>Evento ID: {eventId}</p>
        </div>
    );
}
