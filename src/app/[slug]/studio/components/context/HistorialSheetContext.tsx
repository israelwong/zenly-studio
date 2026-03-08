'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { HistorialSheet } from '@/app/[slug]/studio/business/finanzas/components/HistorialSheet';

const OPEN_HISTORIAL_EVENT = 'open-historial-sheet';

interface HistorialSheetContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
    openHistorial: () => void;
}

const HistorialSheetContext = createContext<HistorialSheetContextValue | null>(null);

export function HistorialSheetProvider({
    studioSlug,
    children,
}: {
    studioSlug: string;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const openHistorial = useCallback(() => {
        window.dispatchEvent(new CustomEvent(OPEN_HISTORIAL_EVENT));
    }, []);

    useEffect(() => {
        const handler = () => setOpen(true);
        window.addEventListener(OPEN_HISTORIAL_EVENT, handler);
        return () => window.removeEventListener(OPEN_HISTORIAL_EVENT, handler);
    }, []);

    return (
        <HistorialSheetContext.Provider value={{ open, setOpen, openHistorial }}>
            {children}
            <HistorialSheet open={open} onOpenChange={setOpen} studioSlug={studioSlug} />
        </HistorialSheetContext.Provider>
    );
}

export function useHistorialSheet(): HistorialSheetContextValue {
    const ctx = useContext(HistorialSheetContext);
    if (!ctx) {
        return {
            open: false,
            setOpen: () => {},
            openHistorial: () => window.dispatchEvent(new CustomEvent(OPEN_HISTORIAL_EVENT)),
        };
    }
    return ctx;
}
