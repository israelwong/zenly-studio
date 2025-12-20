import { redirect } from 'next/navigation';

interface StudioPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export default async function StudioPage({ params }: StudioPageProps) {
    const { slug } = await params;
    // Redirect to dashboard
    redirect(`/${slug}/studio/commercial/dashboard`);
}
