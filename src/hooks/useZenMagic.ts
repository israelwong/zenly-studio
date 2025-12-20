'use client';

import { useState, useCallback } from 'react';

/**
 * Hook para manejar el estado de ZEN Magic Chat
 * 
 * TODO: Implementar funcionalidades futuras:
 * - Persistencia de estado en localStorage
 * - Sincronización entre pestañas
 * - Contexto automático basado en ruta
 * - Gestión de pestañas por módulo
 * - Integración con IA/LLM
 */
export function useZenMagic() {
    const [isOpen, setIsOpen] = useState(false);

    const toggleChat = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    const openChat = useCallback(() => {
        setIsOpen(true);
    }, []);

    const closeChat = useCallback(() => {
        setIsOpen(false);
    }, []);

    return {
        isOpen,
        toggleChat,
        openChat,
        closeChat
    };
}
