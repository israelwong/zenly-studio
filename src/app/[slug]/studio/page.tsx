import { redirect } from 'next/navigation';

interface StudioPageProps {
    params: {
        slug: string;
    };
}

export default function StudioPage({ params }: StudioPageProps) {
    // Redirect to dashboard
    redirect(`/${params.slug}/studio/commercial/dashboard`);
}
