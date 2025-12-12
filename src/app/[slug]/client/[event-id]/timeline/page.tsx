export default async function ClienteTimeline({
    params
}: {
    params: Promise<{ slug: string; 'event-id': string }>
}) {
    const { slug, 'event-id': eventId } = await params;
    return (
        <div>
            <h1>Timeline del Evento - {slug}</h1>
            <p>Evento ID: {eventId}</p>
        </div>
    );
}
