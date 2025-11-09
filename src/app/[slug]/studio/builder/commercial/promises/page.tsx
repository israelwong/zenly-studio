'use client';

import React, { useRef } from 'react';
import { useParams } from 'next/navigation';
import { UserSearch, Plus } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { PromisesWrapper } from './components';

export default function PromisesPage() {
  const params = useParams();
  const studioSlug = params.slug as string;
  const openPromiseFormRef = useRef<(() => void) | null>(null);

  const handleOpenPromiseForm = () => {
    if (openPromiseFormRef.current) {
      openPromiseFormRef.current();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col">
      <ZenCard variant="default" padding="none" className="flex flex-col flex-1 min-h-0">
        <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <UserSearch className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <ZenCardTitle>Promesas</ZenCardTitle>
                <ZenCardDescription>
                  Gestiona tus promesas de eventos
                </ZenCardDescription>
              </div>
            </div>
            <ZenButton onClick={handleOpenPromiseForm}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Promesa
            </ZenButton>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6 flex-1 min-h-0 overflow-hidden">
          <PromisesWrapper studioSlug={studioSlug} onOpenPromiseFormRef={openPromiseFormRef} />
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

