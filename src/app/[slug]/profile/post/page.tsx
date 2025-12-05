import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/user-utils-server';
import { PostCreatorClient } from './PostCreatorClient';

interface PageProps {
    params: Promise<{
        slug: string;
    }>;
    searchParams: Promise<{
        id?: string;
    }>;
}

export default async function PostCreatorPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const { id } = await searchParams;

    // Autenticación
    const user = await getAuthenticatedUser(slug);
    if (!user) {
        redirect('/login');
    }

    return (
        <PostCreatorClient
            studioSlug={slug}
            postId={id}
        />
    );
}
