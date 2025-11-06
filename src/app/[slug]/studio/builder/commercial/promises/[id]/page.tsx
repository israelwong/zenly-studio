'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { PromiseForm, type PromiseFormRef } from '../../components/PromiseForm';
import { getProspects, getPromiseIdByContactId } from '@/lib/actions/studio/builder/commercial/prospects';
import { toast } from 'sonner';
import { PromisesSkeleton } from '../../components';

export default function EditarPromesaPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.id as string;
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
        // Obtener todos los prospects y filtrar por ID
        const result = await getProspects(studioSlug, {
          page: 1,
          limit: 1000,
        });

        if (result.success && result.data) {
          const prospect = result.data.prospects.find((p) => p.id === promiseId);
          if (prospect) {
            // Obtener promiseId real
            const promiseResult = await getPromiseIdByContactId(prospect.id);
            setInitialData({
              id: prospect.id,
              name: prospect.name,
              phone: prospect.phone,
              email: prospect.email,
              event_type_id: prospect.event_type_id || null,
              interested_dates: prospect.interested_dates,
              promiseId: promiseResult.success && promiseResult.data ? promiseResult.data.promise_id : null,
            });
          } else {
            toast.error('Promesa no encontrada');
            router.push(`/${studioSlug}/studio/builder/commercial/promises`);
          }
        } else {
          toast.error('Error al cargar la promesa');
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
          <div className="flex items-center justify-between w-full">
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
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                onClick={() => formRef.current?.cancel()}
                disabled={isFormLoading}
              >
                Cancelar
              </ZenButton>
              <ZenButton
                onClick={() => formRef.current?.submit()}
                loading={isFormLoading}
              >
                Actualizar Promesa
              </ZenButton>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <PromiseForm
            ref={formRef}
            studioSlug={studioSlug}
            initialData={initialData}
            redirectOnSuccess={`/${studioSlug}/studio/builder/commercial/promises`}
            showButtons={false}
            onLoadingChange={setIsFormLoading}
          />
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

