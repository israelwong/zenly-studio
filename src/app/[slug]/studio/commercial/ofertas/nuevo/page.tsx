'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { OfferEditor } from '../components/OfferEditor';

export default function NuevaOfertaPage() {
  const params = useParams();
  const studioSlug = params.slug as string;

  useEffect(() => {
    document.title = 'ZEN Studio - Nueva Oferta';
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <OfferEditor
        studioSlug={studioSlug}
        mode="create"
      />
    </div>
  );
}
