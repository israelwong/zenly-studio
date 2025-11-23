import React from 'react';
import { ZenSidebarProvider } from '@/components/ui/zen/layout/ZenSidebar';
import { ProfileEditorSidebar } from './components/ProfileEditorSidebar';
import { AppHeader } from '@/app/[slug]/studio/components/AppHeader';
import { ZenMagicChatProvider, ZenMagicChatWrapper } from '@/app/[slug]/studio/components/ZenMagic';
import { ContactsSheetProvider } from '@/components/shared/contacts/ContactsSheetContext';
import { Toaster } from 'sonner';

export default async function ProfileEditorLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    return (
        <ZenMagicChatProvider>
            <ContactsSheetProvider>
                <ZenSidebarProvider>
                    <div className="flex h-screen overflow-hidden">
                        <ProfileEditorSidebar studioSlug={slug} />
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
    );
}

