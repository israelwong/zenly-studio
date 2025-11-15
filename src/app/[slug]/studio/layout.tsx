import React from 'react';
import { ZenMagicChatProvider, ZenMagicChatWrapper } from './components/ZenMagic';
import { ContactsSheetProvider } from '@/components/shared/contacts/ContactsSheetContext';
import { SessionTimeoutProvider } from '@/components/providers/SessionTimeoutProvider';
import { obtenerConfiguracionesSeguridad } from '@/lib/actions/studio/account/seguridad/seguridad.actions';

export default async function AppLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { slug: string };
}) {
    const { slug } = await params;

    // Obtener configuración de timeout
    let sessionTimeout = 30; // Default 30 minutos
    try {
        const settings = await obtenerConfiguracionesSeguridad(slug);
        if (settings?.session_timeout) {
            sessionTimeout = settings.session_timeout;
        }
    } catch (error) {
        console.error('[AppLayout] Error cargando settings de seguridad:', error);
    }

    return (
        <SessionTimeoutProvider inactivityTimeout={sessionTimeout}>
            <ZenMagicChatProvider>
                <ContactsSheetProvider>
                    <div className="flex h-screen w-full overflow-hidden">
                        <div className="flex flex-1 w-full overflow-hidden">
                            <main className="flex-1 w-full overflow-y-auto bg-zinc-900/40">
                                {children}
                            </main>
                        </div>
                        <ZenMagicChatWrapper studioSlug={slug} />
                    </div>
                </ContactsSheetProvider>
            </ZenMagicChatProvider>
        </SessionTimeoutProvider>
    );
}
