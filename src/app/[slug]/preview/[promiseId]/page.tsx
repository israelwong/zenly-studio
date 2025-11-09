import React from 'react';
import { notFound } from 'next/navigation';
import { getPublicPromisePreview } from '@/lib/actions/public/promises.actions';
import { PromisePreviewSection } from '@/components/profile/sections/PromisePreviewSection';

interface PromisePreviewPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PromisePreviewPage({ params }: PromisePreviewPageProps) {
  const { slug, promiseId } = await params;

  // Obtener datos de la promesa con validación de seguridad
  const result = await getPublicPromisePreview(slug, promiseId);

  if (!result.success || !result.data) {
    notFound();
  }

  const promiseData = result.data;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="w-full max-w-md mx-auto">
        <PromisePreviewSection
          promise={{
            id: promiseData.promise_id,
            contactName: promiseData.contact_name,
            contactPhone: promiseData.contact_phone,
            contactEmail: promiseData.contact_email,
            eventTypeName: promiseData.event_type_name,
            interestedDates: promiseData.interested_dates,
            acquisitionChannelName: promiseData.acquisition_channel_name,
            socialNetworkName: promiseData.social_network_name,
            referrerName: promiseData.referrer_name,
          }}
          studioSlug={slug}
        />
      </div>
    </div>
  );
}

