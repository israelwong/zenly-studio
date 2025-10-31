"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface CaptionWithLinksProps {
    caption: string;
    className?: string;
}

/**
 * Componente para renderizar descripción con soporte para links automáticos
 * Detecta URLs y las convierte en links clickeables
 */
export function CaptionWithLinks({ caption, className = "" }: CaptionWithLinksProps) {
    if (!caption) return null;

    // Patrón para detectar URLs (http, https, www)
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

    const renderContent = () => {
        const parts = caption.split(urlPattern);

        return parts.map((part, index) => {
            // Verificar si es una URL
            if (urlPattern.test(part)) {
                // Asegurar que tenga protocolo si empieza con www
                const href = part.startsWith('www.') ? `https://${part}` : part;

                return (
                    <Link
                        key={index}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        {part}
                        <ExternalLink className="w-3 h-3" />
                    </Link>
                );
            }

            return <span key={index}>{part}</span>;
        });
    };

    // Si className está vacío, usar text-zinc-300 por defecto
    // Si className tiene algún valor, usarlo (puede incluir text-white)
    const defaultColor = className ? '' : 'text-zinc-300';
    const finalClassName = className ? className : defaultColor;

    return (
        <div className={`leading-relaxed whitespace-pre-wrap font-light break-words overflow-wrap-anywhere ${finalClassName}`}>
            {renderContent()}
        </div>
    );
}

