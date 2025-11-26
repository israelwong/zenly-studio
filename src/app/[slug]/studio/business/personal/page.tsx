'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
import { CrewMembersManager } from '@/components/shared/crew-members/CrewMembersManager';
import { Users } from 'lucide-react';

export default function PersonalPage() {
  const params = useParams();
  const studioSlug = params.slug as string;
  const [managerOpen, setManagerOpen] = useState(false);

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <ZenCardTitle>Personal</ZenCardTitle>
            <ZenButton
              onClick={() => setManagerOpen(true)}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Gestionar Personal
            </ZenButton>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
            <p className="text-zinc-400 mb-4">
              Gestiona el personal de tu estudio desde aquí
            </p>
            <ZenButton onClick={() => setManagerOpen(true)}>
              Abrir Gestión de Personal
            </ZenButton>
          </div>
        </ZenCardContent>
      </ZenCard>

      <CrewMembersManager
        studioSlug={studioSlug}
        mode="manage"
        isOpen={managerOpen}
        onClose={() => setManagerOpen(false)}
      />
    </div>
  );
}
