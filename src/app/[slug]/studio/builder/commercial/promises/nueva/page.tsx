'use client';

import React, { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { PromiseForm, type PromiseFormRef } from '../components/PromiseForm';
import { useRouter } from 'next/navigation';

export default function NuevaPromesaPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const formRef = useRef<PromiseFormRef>(null);
  const [isLoading, setIsLoading] = useState(false);

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
              <ZenCardTitle>Nueva Promesa</ZenCardTitle>
              <ZenCardDescription>
                Registra una nueva promesa de evento
              </ZenCardDescription>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <PromiseForm
            ref={formRef}
            studioSlug={studioSlug}
            onLoadingChange={setIsLoading}
          />
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

