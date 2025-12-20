'use client';

import { ZenCard } from '@/components/ui/zen';
import { ToastContainer } from '@/components/client';
import { useToast } from '@/hooks/useToast';

export default function VideoPage() {
  const { toasts, removeToast } = useToast();

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Video</h1>
        <p className="text-zinc-400">Videos del evento</p>
      </div>

      <ZenCard>
        <div className="p-12 text-center">
          <p className="text-zinc-400">Próximamente: Galería de videos</p>
        </div>
      </ZenCard>
    </>
  );
}
