'use client';

import React from 'react';
import { useZenMagicChat } from './ZenMagicChatProvider';
import { ZenMagicChat } from './ZenMagicChat';

interface ZenMagicChatWrapperProps {
    studioSlug: string;
}

/**
 * Wrapper para ZEN Magic Chat que maneja el estado dinámicamente
 * Integra el chat dentro del layout sin superposición
 */
export function ZenMagicChatWrapper({ studioSlug }: ZenMagicChatWrapperProps) {
    const { isOpen, closeChat } = useZenMagicChat();

    return (
        <ZenMagicChat
            isOpen={isOpen}
            onClose={closeChat}
            studioSlug={studioSlug}
        />
    );
}
