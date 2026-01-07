'use client';

import React from 'react';
import { usePlatformBranding } from '@/hooks/usePlatformConfig';

/**
 * PublicPageFooter - Footer unificado para páginas públicas
 * Créditos Zenly con diseño elegante y consistente
 * Usado en: offers, promises, client portal, profiles
 */
export function PublicPageFooter() {
    const { companyName, commercialName, domain } = usePlatformBranding();
    const currentYear = new Date().getFullYear();
    const displayName = commercialName || companyName || 'Zenly Studio';
    const domainUrl = domain ? `https://${domain}` : 'https://zenly.mx';
    const displayDomain = domain || 'zenly.mx';

    return (
        <footer className=" p-3 mt-10 pt-5 pb-5 relative">
            {/* Créditos Zenly - Minimalista y discreto */}
            <div className="mt-8 pt-4 relative">
                {/* Separador elegante con efecto de profundidad */}
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-zinc-800/60 to-transparent rounded-full"></div>
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-zinc-700/80 to-transparent rounded-full"></div>

                <div className="text-center">
                    <p className="text-zinc-500 text-xs font-light">
                        by <span className="font-semibold text-zinc-400">{displayName}</span> {currentYear}
                    </p>
                    <p className="text-zinc-500 text-xs font-light">
                        todos los derechos reservados
                    </p>
                    <a
                        href={domainUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-500 text-xs mt-1 font-light hover:text-zinc-400 transition-colors duration-200"
                    >
                        {displayDomain}
                    </a>
                </div>
            </div>
        </footer>
    );
}

