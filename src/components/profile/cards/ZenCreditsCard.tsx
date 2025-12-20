'use client';

import React from 'react';
import Link from 'next/link';

/**
 * ZenCreditsCard - Versión minimalista del ProfileFooter para sidebar desktop
 * Sin card, solo línea decorativa y créditos ZEN México
 */
export function ZenCreditsCard() {
    return (
        <div className="pt-4">
            {/* Línea decorativa superior */}
            <div className="h-px bg-linear-to-r from-transparent via-zinc-700 to-transparent mb-4" />

            {/* Créditos ZEN - Minimalista */}
            <div className="text-center space-y-1">
                <p className="text-zinc-500 text-xs font-light">
                    by <Link href="/" className="font-semibold text-zinc-400 hover:text-zinc-300 transition-colors">Zen México</Link> 2025
                </p>
                <p className="text-zinc-500 text-xs font-light">
                    todos los derechos reservados
                </p>
                <Link
                    href="/"
                    className="block text-zinc-500 text-xs font-light hover:text-zinc-400 transition-colors duration-200"
                >
                    www.zenn.mx
                </Link>
            </div>
        </div>
    );
}
