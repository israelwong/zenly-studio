'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PortfolioEditor } from "../components/PortfolioEditorWrapper";

export default function NuevoPortfolioPage() {
    const params = useParams();
    const studioSlug = params.slug as string;

    useEffect(() => {
        document.title = 'ZEN Studio - Nuevo Portafolio';
    }, []);

    return (
        <div className="w-full max-w-7xl mx-auto">
            <PortfolioEditor
                studioSlug={studioSlug}
                mode="create"
            />
        </div>
    );
}

