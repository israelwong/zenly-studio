import React from 'react';
import { ZenSidebarProvider } from '@/components/ui/zen/layout/ZenSidebar';
import { ZenMagicChatProvider } from './components/ZenMagic';
import { ContactsSheetProvider } from '@/components/shared/contacts/ContactsSheetContext';
import { SessionTimeoutProvider } from '@/components/providers/SessionTimeoutProvider';
import { RealtimeProvider } from '@/components/providers/RealtimeProvider';
import { StudioInitializer } from './components/StudioInitializer';
import { Toaster } from 'sonner';
import { StudioLayoutWrapper } from './components/StudioLayoutWrapper';

export default async function StudioLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { slug: string };
}) {
    const { slug } = await params;

    // Obtener configuración de timeout usando importación dinámica con timeout
    let sessionTimeout = 30; // Default 30 minutos
    try {
        const { obtenerConfiguracionesSeguridad } = await import('@/lib/actions/studio/account/seguridad/seguridad.actions');
        // Usar Promise.race para evitar bloqueos largos
        const settings = await Promise.race([
            obtenerConfiguracionesSeguridad(slug),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)) // Timeout de 5s
        ]);
        if (settings?.session_timeout) {
            sessionTimeout = settings.session_timeout;
        }
    } catch (error) {
        // Silenciar errores de timeout para no bloquear el render
        if (error instanceof Error && !error.message.includes('timeout')) {
            console.error('[StudioLayout] Error cargando settings de seguridad:', error);
        }
    }

    return (
        <SessionTimeoutProvider inactivityTimeout={sessionTimeout}>
            <RealtimeProvider studioSlug={slug} enabled={true}>
                <StudioInitializer studioSlug={slug} />
                <ZenMagicChatProvider>
                    <ContactsSheetProvider>
                        <ZenSidebarProvider>
                            <StudioLayoutWrapper studioSlug={slug}>
                                {children}
                            </StudioLayoutWrapper>
                            <Toaster position="top-right" richColors />
                        </ZenSidebarProvider>
                    </ContactsSheetProvider>
                </ZenMagicChatProvider>
            </RealtimeProvider>
        </SessionTimeoutProvider>
    );
}
