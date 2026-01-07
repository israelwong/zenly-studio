'use client';

import { useEffect } from 'react';
import { GuiaDeUso } from './GuiaDeUso';

export default function AyudaPage() {
  useEffect(() => {
    document.title = 'Zenly Studio - Ayuda';
  }, []);
    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-white">Centro de Ayuda</h1>
                    <p className="text-sm text-zinc-400 mt-1">Aprende cómo optimizar tu catálogo y paquetes</p>
                </div>
            </div>

            <GuiaDeUso />
        </div>
    );
}

