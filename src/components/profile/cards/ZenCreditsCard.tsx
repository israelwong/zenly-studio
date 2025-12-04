'use client';

import React from 'react';

/**
 * ZenCreditsCard - Versión card del ProfileFooter para sidebar desktop
 * Card minimalista con créditos ZEN México
 */
export function ZenCreditsCard() {
    return (
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6">
            {/* Créditos ZEN - Minimalista */}
            <div className="text-center space-y-2">
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
                    className="block text-zinc-500 text-xs font-light hover:text-zinc-400 transition-colors duration-200"
                >
                    www.zenn.mx
                </a>
            </div>
        </div>
    );
}
