import React from 'react';
import { ZenSidebarProvider } from '@/components/ui/zen/layout/ZenSidebar';
import { StudioSidebar } from './components/StudioSidebar';
import { AppHeader } from './components/AppHeader';
import { ZenMagicChatProvider, ZenMagicChatWrapper } from './components/ZenMagic';
import { ContactsSheetProvider } from '@/components/shared/contacts/ContactsSheetContext';
import { SessionTimeoutProvider } from '@/components/providers/SessionTimeoutProvider';
import { RealtimeProvider } from '@/components/providers/RealtimeProvider';
import { StudioInitializer } from '@/components/studio/StudioInitializer';
import { Toaster } from 'sonner';

export default async function StudioLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { slug: string };
}) {
    const { slug } = await params;

    // Obtener configuración de timeout usando importación dinámica
    let sessionTimeout = 30; // Default 30 minutos
    try {
        const { obtenerConfiguracionesSeguridad } = await import('@/lib/actions/studio/account/seguridad/seguridad.actions');
        const settings = await obtenerConfiguracionesSeguridad(slug);
        if (settings?.session_timeout) {
            sessionTimeout = settings.session_timeout;
        }
    } catch (error) {
        console.error('[StudioLayout] Error cargando settings de seguridad:', error);
    }

    return (
        <SessionTimeoutProvider inactivityTimeout={sessionTimeout}>
            <RealtimeProvider studioSlug={slug} enabled={true}>
                <StudioInitializer studioSlug={slug} />
                <ZenMagicChatProvider>
                    <ContactsSheetProvider>
                        <ZenSidebarProvider>
                            <div className="flex h-screen overflow-hidden">
                                <StudioSidebar studioSlug={slug} />
                                <div className="flex flex-1 overflow-hidden">
                                    <div className="flex flex-col flex-1 overflow-hidden">
                                        <AppHeader studioSlug={slug} />
                                        <main className="flex-1 overflow-y-auto bg-zinc-900/40">
                                            <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
                                                {children}
                                            </div>
                                        </main>
                                    </div>
                                </div>
                                <ZenMagicChatWrapper studioSlug={slug} />
                            </div>
                            <Toaster position="top-right" richColors />
                        </ZenSidebarProvider>
                    </ContactsSheetProvider>
                </ZenMagicChatProvider>
            </RealtimeProvider>
        </SessionTimeoutProvider>
    );
}
