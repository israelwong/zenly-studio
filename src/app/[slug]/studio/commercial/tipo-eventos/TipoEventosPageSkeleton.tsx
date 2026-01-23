import { ZenCard, ZenCardContent } from '@/components/ui/zen';

export function TipoEventosPageSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      <ZenCard>
        <ZenCardContent className="p-6">
          <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
