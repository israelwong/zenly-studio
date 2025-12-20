import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { MessageSquare } from 'lucide-react';

export default function ConversationsPage() {
    return (
        <div className="w-full max-w-7xl mx-auto p-6">
            <ZenCard variant="default">
                <ZenCardHeader>
                    <div className="flex items-center gap-3">
                        <MessageSquare className="w-6 h-6 text-emerald-400" />
                        <div>
                            <ZenCardTitle>Conversations</ZenCardTitle>
                            <ZenCardDescription>
                                Bandeja de entrada de conversaciones multi-canal (WhatsApp, Facebook, Instagram)
                            </ZenCardDescription>
                        </div>
                    </div>
                </ZenCardHeader>
                <ZenCardContent>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <MessageSquare className="w-16 h-16 text-zinc-600 mb-4" />
                        <h3 className="text-lg font-semibold text-zinc-300 mb-2">
                            Próximamente
                        </h3>
                        <p className="text-zinc-500 max-w-md">
                            Esta funcionalidad estará disponible próximamente. 
                            Integraremos conversaciones de WhatsApp, Facebook e Instagram 
                            a través de ManyChat.
                        </p>
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}

