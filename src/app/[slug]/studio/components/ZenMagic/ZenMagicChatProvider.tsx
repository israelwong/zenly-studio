'use client';

import React, { createContext, useContext } from 'react';
import { useZenMagic } from '@/hooks/useZenMagic';
import { ZenMagicChat } from './ZenMagicChat';

interface ZenMagicChatContextType {
    isOpen: boolean;
    toggleChat: () => void;
    openChat: () => void;
    closeChat: () => void;
}

const ZenMagicChatContext = createContext<ZenMagicChatContextType | undefined>(undefined);

export function useZenMagicChat() {
    const context = useContext(ZenMagicChatContext);
    if (!context) {
        throw new Error('useZenMagicChat must be used within a ZenMagicChatProvider');
    }
    return context;
}

interface ZenMagicChatProviderProps {
    children: React.ReactNode;
}

/**
 * Provider para ZEN Magic Chat
 * 
 * TODO: Implementar funcionalidades futuras:
 * - Contexto automático basado en módulo actual
 * - Pestañas por contexto
 * - Persistencia de estado
 * - Integración con IA/LLM
 * - RAG para mantener contexto
 */
export function ZenMagicChatProvider({ children }: ZenMagicChatProviderProps) {
    const zenMagicState = useZenMagic();

    return (
        <ZenMagicChatContext.Provider value={zenMagicState}>
            {children}
        </ZenMagicChatContext.Provider>
    );
}
