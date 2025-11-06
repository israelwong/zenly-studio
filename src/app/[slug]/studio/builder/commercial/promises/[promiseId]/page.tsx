'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { PromiseForm, type PromiseFormRef } from '../components/PromiseForm';
import { getPromiseById } from '@/lib/actions/studio/builder/commercial/prospects';
import { toast } from 'sonner';
import { PromisesSkeleton } from '../components';

export default function EditarPromesaPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const formRef = useRef<PromiseFormRef>(null);
  const [loading, setLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [initialData, setInitialData] = useState<{
    id: string;
    name: string;
    phone: string;
    email: string | null;
    event_type_id: string | null;
    interested_dates: string[] | null;
    acquisition_channel_id?: string;
    social_network_id?: string;
    referrer_contact_id?: string;
    referrer_name?: string;
    promiseId?: string | null;
  } | null>(null);

  useEffect(() => {
    const loadPromise = async () => {
      try {
        setLoading(true);
        // Obtener promesa directamente por promiseId
        const result = await getPromiseById(promiseId);

        if (result.success && result.data) {
          setInitialData({
            id: result.data.contact_id,
            name: result.data.contact_name,
            phone: result.data.contact_phone,
            email: result.data.contact_email,
            event_type_id: result.data.event_type_id || null,
            interested_dates: result.data.interested_dates,
            acquisition_channel_id: result.data.acquisition_channel_id || undefined,
            social_network_id: result.data.social_network_id || undefined,
            referrer_contact_id: result.data.referrer_contact_id || undefined,
            referrer_name: result.data.referrer_name || undefined,
            promiseId: result.data.promise_id,
          });
        } else {
          toast.error(result.error || 'Promesa no encontrada');
          router.push(`/${studioSlug}/studio/builder/commercial/promises`);
        }
      } catch (error) {
        console.error('Error loading promise:', error);
        toast.error('Error al cargar la promesa');
        router.push(`/${studioSlug}/studio/builder/commercial/promises`);
      } finally {
        setLoading(false);
      }
    };

    if (promiseId) {
      loadPromise();
    }
  }, [promiseId, studioSlug, router]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <ZenCardContent className="p-6">
            <PromisesSkeleton />
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!initialData) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => formRef.current?.cancel()}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </ZenButton>
            <div>
              <ZenCardTitle>Editar Promesa</ZenCardTitle>
              <ZenCardDescription>
                Actualiza la información de la promesa
              </ZenCardDescription>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <PromiseForm
            ref={formRef}
            studioSlug={studioSlug}
            initialData={initialData}
            onLoadingChange={setIsFormLoading}
          />
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

