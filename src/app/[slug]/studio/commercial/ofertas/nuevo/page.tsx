'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { OfferEditor } from '../components/OfferEditor';

export default function NuevaOfertaPage() {
  const params = useParams();
  const studioSlug = params.slug as string;

  return (
    <div className="w-full max-w-7xl mx-auto">
      <OfferEditor
        studioSlug={studioSlug}
        mode="create"
      />
    </div>
  );
}
