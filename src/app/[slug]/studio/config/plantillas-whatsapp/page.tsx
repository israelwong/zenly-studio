'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { WhatsAppTemplatesClient } from './components/WhatsAppTemplatesClient';

export default function PlantillasWhatsAppPage() {
  const params = useParams();

  useEffect(() => {
    document.title = 'ZEN Studio - Plantillas WhatsApp';
  }, []);

  const studioSlug = params?.slug as string;
  if (!studioSlug) return null;

  return <WhatsAppTemplatesClient studioSlug={studioSlug} />;
}
