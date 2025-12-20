'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Edit } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUserClient } from '@/lib/auth/user-utils-client';

interface PublicProfileEditButtonProps {
    studioSlug: string;
}

export function PublicProfileEditButton({ studioSlug }: PublicProfileEditButtonProps) {
    const { user, loading: authLoading } = useAuth();
    const [isOwner, setIsOwner] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkOwnership = async () => {
            if (authLoading || !user) {
                setIsOwner(false);
                setChecking(false);
                return;
            }

            try {
                const authUser = await getCurrentUserClient(studioSlug);
                if (authUser && authUser.profile) {
                    // Verificar si el usuario es dueño del estudio
                    // Un usuario es dueño si tiene un perfil activo en el studio
                    setIsOwner(true);
                } else {
                    setIsOwner(false);
                }
            } catch (error) {
                console.error('[PublicProfileEditButton] Error verificando ownership:', error);
                setIsOwner(false);
            } finally {
                setChecking(false);
            }
        };

        checkOwnership();
    }, [user, studioSlug, authLoading]);

    // No mostrar nada si está cargando o no es dueño
    if (checking || authLoading || !isOwner) {
        return null;
    }

    return (
        <Link href={`/${studioSlug}/profile/edit/content/posts`}>
            <ZenButton
                variant="ghost"
                size="sm"
                className="text-xs text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 px-3 py-1.5 h-auto"
            >
                <Edit className="h-3 w-3 mr-1" />
                Editar
            </ZenButton>
        </Link>
    );
}

