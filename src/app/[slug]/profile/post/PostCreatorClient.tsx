'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PostEditorSheet } from '@/components/profile/sheets/PostEditorSheet';

interface PostCreatorClientProps {
    studioSlug: string;
    postId?: string;
}

export function PostCreatorClient({ studioSlug, postId }: PostCreatorClientProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        if (!isOpen) {
            router.push(`/${studioSlug}`);
        }
    }, [isOpen, router, studioSlug]);

    return (
        <PostEditorSheet
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            studioSlug={studioSlug}
            mode={postId ? "edit" : "create"}
            postId={postId}
            onSuccess={() => {
                router.push(`/${studioSlug}`);
            }}
        />
    );
}
