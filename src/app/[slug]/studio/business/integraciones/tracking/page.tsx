"use client";

import { useState, useEffect } from "react";
import { ZenCard, ZenInput, ZenButton } from "@/components/ui/zen";
import { useStudioData } from "@/hooks/useStudioData";
import { actualizarTracking } from "@/lib/actions/studio/business/integraciones.actions";
import { toast } from "sonner";
import { ExternalLink, Loader2, Info } from "lucide-react";
import Link from "next/link";

interface TrackingPageProps {
  params: Promise<{ slug: string }>;
}

export default function TrackingPage({ params }: TrackingPageProps) {
  const [slug, setSlug] = useState<string>("");
  const [gtmId, setGtmId] = useState<string>("");
  const [facebookPixelId, setFacebookPixelId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    params.then((resolvedParams) => {
      setSlug(resolvedParams.slug);
    });
  }, [params]);

  const { identidadData, isLoading } = useStudioData({ studioSlug: slug });

  // Cargar datos iniciales
  useEffect(() => {
    if (identidadData) {
      setGtmId(identidadData.gtm_id || "");
      setFacebookPixelId(identidadData.facebook_pixel_id || "");
    }
  }, [identidadData]);

  const handleSave = async () => {
    if (!slug) return;

    setIsSaving(true);
    try {
      const result = await actualizarTracking(slug, {
        gtm_id: gtmId || null,
        facebook_pixel_id: facebookPixelId || null,
      });

      if (result.success) {
        toast.success("Configuración de tracking actualizada");
      } else {
        toast.error(result.error || "Error al actualizar");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar configuración");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">
          Tracking & Remarketing
        </h1>
        <p className="text-zinc-400">
          Configura tus códigos de seguimiento para medir conversiones y hacer remarketing
        </p>
      </div>

      {/* Google Tag Manager */}
      <ZenCard>
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">
                Google Tag Manager
              </h2>
              <p className="text-sm text-zinc-400">
                Administra todos tus códigos de seguimiento desde un solo lugar
              </p>
            </div>
            <Link
              href="https://tagmanager.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </Link>
          </div>

          <ZenInput
            label="GTM Container ID"
            placeholder="GTM-XXXXXXX"
            value={gtmId}
            onChange={(e) => setGtmId(e.target.value)}
            helper="Formato: GTM-XXXXXXX. Obtén tu ID en Google Tag Manager."
          />
        </div>
      </ZenCard>

      {/* Meta Pixel */}
      <ZenCard>
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">
                Meta Pixel (Facebook)
              </h2>
              <p className="text-sm text-zinc-400">
                Rastrea conversiones y crea audiencias para Meta Ads
              </p>
            </div>
            <Link
              href="https://business.facebook.com/events_manager2"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </Link>
          </div>

          <ZenInput
            label="Pixel ID"
            placeholder="1234567890123456"
            value={facebookPixelId}
            onChange={(e) => setFacebookPixelId(e.target.value)}
            helper="Formato: 16 dígitos. Obtén tu Pixel ID en Meta Business Suite."
          />
        </div>
      </ZenCard>

      {/* Info */}
      <div className="rounded-lg border border-blue-800/30 bg-blue-950/20 p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-medium text-blue-200">¿Dónde se aplican estos códigos?</p>
            <ul className="text-sm space-y-1 ml-4 list-disc text-blue-300/80">
              <li>Landing pages de ofertas públicas</li>
              <li>Formularios de captación de leads</li>
              <li>Páginas de confirmación</li>
            </ul>
            <p className="text-sm mt-2 text-blue-300/80">
              Los códigos se insertan automáticamente en todas tus páginas públicas.
            </p>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <ZenButton
          onClick={handleSave}
          loading={isSaving}
          disabled={isSaving}
        >
          Guardar configuración
        </ZenButton>
      </div>
    </div>
  );
}
