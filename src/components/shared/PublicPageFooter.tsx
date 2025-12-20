'use client';

import React from 'react';

/**
 * PublicPageFooter - Footer unificado para páginas públicas
 * Créditos ZEN con diseño elegante y consistente
 * Usado en: offers, promises, client portal, profiles
 */
export function PublicPageFooter() {
    return (
        <footer className=" p-3 mt-10 pt-5 pb-5 relative">
            {/* Créditos ZEN - Minimalista y discreto */}
            <div className="mt-8 pt-4 relative">
                {/* Separador elegante con efecto de profundidad */}
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-zinc-800/60 to-transparent rounded-full"></div>
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-zinc-700/80 to-transparent rounded-full"></div>

                <div className="text-center">
                    <p className="text-zinc-500 text-xs font-light">
                        by <span className="font-semibold text-zinc-400">Zenn México</span> 2025
                    </p>
                    <p className="text-zinc-500 text-xs font-light">
                        todos los derechos reservados
                    </p>
                    <a
                        href="https://www.zenn.mx"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-500 text-xs mt-1 font-light hover:text-zinc-400 transition-colors duration-200"
                    >
                        www.zenn.mx
                    </a>
                </div>
            </div>
        </footer>
    );
}

