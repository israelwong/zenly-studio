'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

interface ChatMessageRendererProps {
    content: string;
    type: 'user' | 'bot';
}

/**
 * Componente para renderizar mensajes del chat con funcionalidades avanzadas
 * 
 * TODO: Implementar funcionalidades futuras:
 * - Drag & drop de archivos
 * - Acciones directas (registrar prospectos, crear portafolios)
 * - Ramas de contexto clickeables
 * - Integración con Supabase Storage
 * - Validación de rutas dinámicas
 */
export function ChatMessageRenderer({ content, type }: ChatMessageRendererProps) {
    // Función para detectar y convertir URLs en links clickeables
    const renderContentWithLinks = (text: string) => {
        // Patrón para detectar URLs que empiecen con http://localhost:3000
        const urlPattern = /(https?:\/\/localhost:3000[^\s]+)/g;

        return text.split(urlPattern).map((part, index) => {
            if (urlPattern.test(part)) {
                return (
                    <Link
                        key={index}
                        href={part}
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {part}
                        <ExternalLink className="w-3 h-3" />
                    </Link>
                );
            }
            return part;
        });
    };

    // Función para detectar y convertir texto entre <link> y </link> en links clickeables
    const renderContentWithCustomLinks = (text: string) => {
        // Patrón para detectar <link>texto</link> y convertirlo en link clickeable
        const linkPattern = /<link>([^<]+)<\/link>/g;

        return text.split(linkPattern).map((part, index) => {
            if (index % 2 === 1) {
                // Este es el texto del link
                return (
                    <Link
                        key={index}
                        href={`/demo-studio/catalogo`}
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline transition-colors"
                    >
                        {part}
                        <ExternalLink className="w-3 h-3" />
                    </Link>
                );
            }
            return part;
        });
    };

    // Función principal que combina ambos patrones
    const renderMessage = (text: string) => {
        // Primero procesar links customizados
        const withCustomLinks = renderContentWithCustomLinks(text);

        // Luego procesar URLs directas
        return withCustomLinks.map((part, index) => {
            if (typeof part === 'string') {
                return renderContentWithLinks(part);
            }
            return part;
        });
    };

    return (
        <div className="text-sm">
            {renderMessage(content)}
        </div>
    );
}
