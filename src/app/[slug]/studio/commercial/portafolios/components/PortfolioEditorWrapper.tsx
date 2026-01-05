'use client';

import dynamic from 'next/dynamic';
import { PortfolioEditorSkeleton } from './PortfolioEditorSkeleton';

// Importar PortfolioEditor sin SSR para evitar errores de hidratación
const PortfolioEditor = dynamic(
    () => import('./PortfolioEditor').then(mod => ({ default: mod.PortfolioEditor })),
    {
        ssr: false,
        loading: () => <PortfolioEditorSkeleton />
    }
);

export { PortfolioEditor };
