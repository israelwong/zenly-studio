'use client';

import { usePathname } from 'next/navigation';
import { EventDetailSkeleton } from './components/EventDetailSkeleton';
import { SchedulerSkeleton } from './scheduler/components/SchedulerSkeleton';

export default function EventDetailLoading() {
  const pathname = usePathname();
  const isScheduler = pathname?.includes('/scheduler') ?? false;
  return isScheduler ? <SchedulerSkeleton /> : <EventDetailSkeleton />;
}
