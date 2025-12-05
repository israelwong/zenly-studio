'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { useAuth } from '@/contexts/AuthContext';

interface QuickActionsProps {
    studioSlug: string;
}

/**
 * QuickActions - FAB para mobile
 * Desktop: Botones en ProfileHeader
 * Mobile: FAB (Floating Action Button) para Post
 * Solo visible si hay sesión iniciada
 */
export function QuickActions({ studioSlug }: QuickActionsProps) {
    const router = useRouter();
    const { user, loading } = useAuth();

    // No mostrar nada mientras carga o si no hay usuario
    if (loading || !user) {
        return null;
    }

    const handleNewPost = () => {
        router.push(`/${studioSlug}/profile/edit/content/posts/nuevo`);
    };

    return (
        /* Mobile: FAB (Floating Action Button) */
        <div className="sm:hidden fixed bottom-6 right-6 z-40">
            <button
                onClick={handleNewPost}
                className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                aria-label="Crear post"
            >
                <Plus className="w-6 h-6" />
            </button>
        </div>
    );
}
