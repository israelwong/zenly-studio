'use client';

import React, { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { UserSearch, Plus, Settings2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { PromisesWrapper } from './components';
import { CondicionesComercialesManager } from '@/components/shared/condiciones-comerciales';
import { TerminosCondicionesManager } from '@/components/shared/terminos-condiciones';
import { FileText } from 'lucide-react';

export default function PromisesPage() {
  const params = useParams();
  const studioSlug = params.slug as string;
  const openPromiseFormRef = useRef<(() => void) | null>(null);
  const [showCondicionesManager, setShowCondicionesManager] = useState(false);
  const [showTerminosManager, setShowTerminosManager] = useState(false);

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
            <div className="flex items-center gap-2">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setShowTerminosManager(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Términos y Condiciones
              </ZenButton>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setShowCondicionesManager(true)}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Condiciones Comerciales
              </ZenButton>
              <ZenButton onClick={handleOpenPromiseForm}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Promesa
              </ZenButton>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6 flex-1 min-h-0 overflow-hidden">
          <PromisesWrapper studioSlug={studioSlug} onOpenPromiseFormRef={openPromiseFormRef} />
        </ZenCardContent>
      </ZenCard>

      <CondicionesComercialesManager
        studioSlug={studioSlug}
        isOpen={showCondicionesManager}
        onClose={() => setShowCondicionesManager(false)}
      />

      <TerminosCondicionesManager
        studioSlug={studioSlug}
        isOpen={showTerminosManager}
        onClose={() => setShowTerminosManager(false)}
      />
    </div>
  );
}

