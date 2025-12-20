import { redirect } from 'next/navigation';

interface DashboardPageProps {
    params: Promise<{
        slug: string;
    }>;
}

/**
 * Redirect legacy /studio/dashboard to /studio/commercial/dashboard
 * Esta página solo existe para mantener compatibilidad con links viejos
 */
export default async function LegacyDashboardPage({ params }: DashboardPageProps) {
    const { slug } = await params;
    redirect(`/${slug}/studio/commercial/dashboard`);
}
