'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { PromiseFormModal, type PromiseFormRef } from '../components/PromiseFormModal';
import { PromiseDetailToolbar } from '../[promiseId]/components/PromiseDetailToolbar';
import { useRouter } from 'next/navigation';

export default function NuevaPromesaPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const formRef = useRef<PromiseFormRef>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contactData, setContactData] = useState<{
    contactId: string;
    contactName: string;
    phone: string;
    email: string | null;
    promiseId: string;
  } | null>(null);

  useEffect(() => {
    document.title = 'Zenly Studio - Nueva Promesa';
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (formRef.current?.contactData) {
        setContactData(formRef.current.contactData as {
          contactId: string;
          contactName: string;
          phone: string;
          email: string | null;
          promiseId: string;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
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
                <ZenCardTitle>Nueva Promesa</ZenCardTitle>
                <ZenCardDescription>
                  Registra una nueva promesa de evento
                </ZenCardDescription>
              </div>
            </div>
          </div>
        </ZenCardHeader>
        {contactData && (
          <PromiseDetailToolbar
            studioSlug={studioSlug}
            promiseId={contactData.promiseId}
            contactData={{
              contactId: contactData.contactId,
              contactName: contactData.contactName,
              phone: contactData.phone,
            }}
            onCopyLink={async () => {
              const previewUrl = `${window.location.origin}/${studioSlug}/promise/${contactData.promiseId}`;
              try {
                await navigator.clipboard.writeText(previewUrl);
                // toast se maneja internamente en PromiseDetailToolbar
              } catch (error) {
                console.error('Error al copiar link:', error);
              }
            }}
            onPreview={() => {
              const previewUrl = `${window.location.origin}/${studioSlug}/promise/${contactData.promiseId}`;
              window.open(previewUrl, '_blank');
            }}
          />
        )}
        <ZenCardContent className="p-6">
          <PromiseFormModal
            ref={formRef}
            studioSlug={studioSlug}
            onLoadingChange={setIsLoading}
          />
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

