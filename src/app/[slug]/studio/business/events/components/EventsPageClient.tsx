'use client';

import React, { useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { EventsKanbanClient } from './EventsKanbanClient';
import { Suspense } from 'react';
import { EventsSkeleton } from './EventsSkeleton';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
import type { EventsListResponse } from '@/lib/actions/studio/business/events';

interface EventsPageClientProps {
  studioSlug: string;
  initialPipelineStages: EventPipelineStage[];
  eventsPromise: Promise<EventsListResponse>;
}

export function EventsPageClient({
  studioSlug,
  initialPipelineStages,
  eventsPromise,
}: EventsPageClientProps) {
  useEffect(() => {
    document.title = 'Zenly Studio - Eventos';
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col">
      <ZenCard variant="default" padding="none" className="flex flex-col flex-1 min-h-0">
        <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <ZenCardTitle>Eventos</ZenCardTitle>
                <ZenCardDescription>
                  Gestiona tus eventos autorizados y sus procesos operativos
                </ZenCardDescription>
              </div>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6 flex-1 min-h-0 overflow-hidden">
          <Suspense fallback={<EventsSkeleton />}>
            <EventsKanbanClient
              studioSlug={studioSlug}
              initialPipelineStages={initialPipelineStages}
              eventsPromise={eventsPromise}
            />
          </Suspense>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
