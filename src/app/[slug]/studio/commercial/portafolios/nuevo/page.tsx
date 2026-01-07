'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PortfolioEditor } from "../components/editors/PortfolioEditor";

export default function NuevoPortfolioPage() {
    const params = useParams();
    const studioSlug = params.slug as string;

    useEffect(() => {
        document.title = 'Zenly Studio - Nuevo Portafolio';
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

