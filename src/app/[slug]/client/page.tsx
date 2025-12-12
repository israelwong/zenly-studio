export default async function ClienteHome({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return (
        <div>
            <h1>Portal del Cliente - {slug}</h1>
            <p>Portal principal del cliente</p>
        </div>
    );
}
