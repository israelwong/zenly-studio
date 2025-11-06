'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { UserSearch } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { ProspectsWrapper } from './components';

export default function ProspectsPage() {
  const params = useParams();
  const studioSlug = params.slug as string;

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <UserSearch className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <ZenCardTitle>Prospects</ZenCardTitle>
              <ZenCardDescription>
                Gestiona tus prospectos
              </ZenCardDescription>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <ProspectsWrapper studioSlug={studioSlug} />
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

