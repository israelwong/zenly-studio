'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { CotizacionForm } from '../../../../components/CotizacionForm';
import { CotizacionDetailSheet } from '@/components/promise/CotizacionDetailSheet';
import { getPromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import { toast } from 'sonner';
import type { PublicCotizacion } from '@/types/public-promise';

interface NuevaCotizacionClientProps {
  studioSlug: string;
  promiseId: string;
  packageId: string | null;
  contactId: string | null;
}

export function NuevaCotizacionClient({
  studioSlug,
  promiseId,
  packageId,
  contactId,
}: NuevaCotizacionClientProps) {
  const router = useRouter();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewCotizacion, setPreviewCotizacion] = useState<PublicCotizacion | null>(null);
  const previewDataRef = useRef<(() => PublicCotizacion | null) | null>(null);
  const [shareSettings, setShareSettings] = useState({ show_items_prices: true, show_categories_subtotals: false });

  useEffect(() => {
    document.title = 'Zenly Studio - Nueva Cotización';
  }, []);

  const loadShareSettings = useCallback(async () => {
    if (!promiseId || !studioSlug) return;
    const result = await getPromiseShareSettings(studioSlug, promiseId);
    if (result.success && result.data) {
      setShareSettings({
        show_items_prices: result.data.show_items_prices ?? true,
        show_categories_subtotals: result.data.show_categories_subtotals ?? false,
      });
    }
  }, [promiseId, studioSlug]);

  useEffect(() => {
    loadShareSettings();
  }, [loadShareSettings]);

  const handleOpenPreview = useCallback(() => {
    const data = previewDataRef.current?.() ?? null;
    if (!data) {
      toast.info('Completa los datos de la cotización para ver la vista previa');
      return;
    }
    setPreviewCotizacion(data);
    setIsPreviewOpen(true);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </ZenButton>
            <div>
              <ZenCardTitle>Nueva Cotización</ZenCardTitle>
              <ZenCardDescription>
                {packageId ? 'Crear cotización desde paquete' : 'Crear cotización personalizada'}
              </ZenCardDescription>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <CotizacionForm
            studioSlug={studioSlug}
            promiseId={promiseId}
            packageId={packageId}
            contactId={contactId}
            redirectOnSuccess={`/${studioSlug}/studio/commercial/promises/${promiseId}`}
            getPreviewDataRef={previewDataRef}
            onRequestPreview={handleOpenPreview}
          />
        </ZenCardContent>
      </ZenCard>

      {previewCotizacion && (
        <CotizacionDetailSheet
          cotizacion={previewCotizacion}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewCotizacion(null);
          }}
          promiseId={promiseId}
          studioSlug={studioSlug}
          showItemsPrices={shareSettings.show_items_prices}
          showCategoriesSubtotals={shareSettings.show_categories_subtotals}
          isPreviewMode
        />
      )}
    </div>
  );
}
