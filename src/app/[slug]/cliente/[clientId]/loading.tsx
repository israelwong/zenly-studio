import { DashboardSkeleton } from '@/components/client';

export default function ClienteDashboardLoading() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Page Header Skeleton */}
      <div className="mb-8">
        <div className="h-9 bg-zinc-800/50 rounded w-48 animate-pulse mb-2" />
        <div className="h-5 bg-zinc-800/50 rounded w-64 animate-pulse" />
      </div>

      {/* Content Skeleton */}
      <DashboardSkeleton />
    </div>
  );
}
