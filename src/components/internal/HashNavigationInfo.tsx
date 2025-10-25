'use client';

import React, { useState } from 'react';
import { Info, Copy, Check } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

interface HashNavigationInfoProps {
    studioSlug: string;
}

export function HashNavigationInfo({ studioSlug }: HashNavigationInfoProps) {
    const [copiedHash, setCopiedHash] = useState<string | null>(null);

    const baseUrl = `${window.location.origin}/studio/${studioSlug}/builder/identidad`;

    const hashExamples = [
        { hash: 'header', label: 'Header', description: 'Configuración de logo, nombre y slogan' },
        { hash: 'social', label: 'Social', description: 'Gestión de redes sociales' },
        { hash: 'faq', label: 'FAQ', description: 'Preguntas frecuentes' },
        { hash: 'footer', label: 'Footer', description: 'Palabras clave y sitio web' }
    ];

    const copyToClipboard = async (hash: string) => {
        const url = `${baseUrl}#${hash}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopiedHash(hash);
            setTimeout(() => setCopiedHash(null), 2000);
        } catch (error) {
            console.error('Error copying to clipboard:', error);
        }
    };

    return (
        <div className="mt-6 p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Info className="h-4 w-4 text-blue-400" />
                </div>
                <div className="space-y-3">
                    <h4 className="text-white font-medium text-sm">Navegación por URL</h4>
                    <p className="text-xs text-zinc-400">
                        Puedes compartir enlaces directos a pestañas específicas usando estos hashes:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {hashExamples.map((example) => (
                            <div key={example.hash} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-blue-400">#{example.hash}</span>
                                        <span className="text-xs text-white">{example.label}</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 truncate">{example.description}</p>
                                </div>
                                <ZenButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(example.hash)}
                                    className="ml-2 p-1 h-6 w-6"
                                >
                                    {copiedHash === example.hash ? (
                                        <Check className="h-3 w-3 text-green-400" />
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                </ZenButton>
                            </div>
                        ))}
                    </div>

                    <div className="text-xs text-zinc-500">
                        <p><strong>Ejemplo:</strong> <code className="text-blue-400">{baseUrl}#social</code></p>
                        <p className="mt-1">Los enlaces se actualizan automáticamente al cambiar de pestaña.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
