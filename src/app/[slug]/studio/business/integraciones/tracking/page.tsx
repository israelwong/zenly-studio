"use client";

import { useState, useEffect } from "react";
import { ZenCard, ZenCardHeader, ZenCardContent, ZenCardTitle, ZenCardDescription, ZenInput, ZenButton, ZenBadge } from "@/components/ui/zen";
import { useStudioData } from "@/hooks/useStudioData";
import { actualizarTracking } from "@/lib/actions/studio/business/integraciones.actions";
import { toast } from "sonner";
import { ExternalLink, Loader2, Info, Plug, CreditCard } from "lucide-react";
import Image from "next/image";
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
    document.title = 'ZEN Studio - Tracking';
  }, []);

  useEffect(() => {
    params.then((resolvedParams) => {
      setSlug(resolvedParams.slug);
    });
  }, [params]);

  const { identidadData, loading: isLoading } = useStudioData({ studioSlug: slug });

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
        toast.success("Configuración actualizada");
      } else {
        toast.error(result.error || "Error al actualizar");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
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
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col">
      <ZenCard variant="default" padding="none" className="flex flex-col flex-1 min-h-0">
        <ZenCardHeader className="border-b border-zinc-800 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600/20 rounded-lg">
                <Plug className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <ZenCardTitle>Integraciones</ZenCardTitle>
                <ZenCardDescription>
                  Configura tus códigos de tracking para remarketing
                </ZenCardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ZenButton onClick={handleSave} loading={isSaving} disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar configuración"}
              </ZenButton>
            </div>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-6 flex-1 min-h-0 overflow-auto">
          <div className="max-w-5xl space-y-6">
            {/* Tracking Section */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                Tracking & Remarketing
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Google Tag Manager */}
                <ZenCard>
                  <ZenCardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <ZenCardTitle className="flex items-center gap-2">
                          <Image
                            src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/google-calendar.svg"
                            alt="Google"
                            width={20}
                            height={20}
                            className="object-contain"
                          />
                          <span className="text-base">Google Tag Manager</span>
                        </ZenCardTitle>
                        <ZenCardDescription>
                          Administra tus códigos de seguimiento
                        </ZenCardDescription>
                      </div>
                      <Link
                        href="https://tagmanager.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-zinc-800/50 text-emerald-400 hover:text-emerald-300 transition-colors"
                        title="Abrir Google Tag Manager"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </Link>
                    </div>
                  </ZenCardHeader>
                  <ZenCardContent>
                    <ZenInput
                      label="GTM Container ID"
                      placeholder="GTM-XXXXXXX"
                      value={gtmId}
                      onChange={(e) => setGtmId(e.target.value)}
                      hint="Obtén tu ID en Google Tag Manager"
                    />
                  </ZenCardContent>
                </ZenCard>

                {/* Meta Pixel */}
                <ZenCard>
                  <ZenCardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <ZenCardTitle className="flex items-center gap-2">
                          <span className="text-base">Meta Pixel</span>
                        </ZenCardTitle>
                        <ZenCardDescription>
                          Crea audiencias para Meta Ads
                        </ZenCardDescription>
                      </div>
                      <Link
                        href="https://business.facebook.com/events_manager2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-zinc-800/50 text-emerald-400 hover:text-emerald-300 transition-colors"
                        title="Abrir Meta Business Suite"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </Link>
                    </div>
                  </ZenCardHeader>
                  <ZenCardContent>
                    <ZenInput
                      label="Pixel ID"
                      placeholder="1234567890123456"
                      value={facebookPixelId}
                      onChange={(e) => setFacebookPixelId(e.target.value)}
                      hint="16 dígitos - Obtén en Meta Business"
                    />
                  </ZenCardContent>
                </ZenCard>
              </div>
            </div>

            {/* Próximamente Section */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                Próximamente
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ManyChat */}
                <ZenCard className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm z-10" />
                  <ZenCardHeader className="relative">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <ZenCardTitle className="flex items-center gap-2">
                          <Image
                            src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/Manychat_White.png"
                            alt="ManyChat"
                            width={20}
                            height={20}
                            className="object-contain"
                          />
                          <span className="text-base text-zinc-400">ManyChat</span>
                          <ZenBadge variant="secondary" className="text-xs">
                            Próximamente
                          </ZenBadge>
                        </ZenCardTitle>
                        <ZenCardDescription>
                          Automatiza conversaciones con clientes
                        </ZenCardDescription>
                      </div>
                    </div>
                  </ZenCardHeader>
                  <ZenCardContent>
                    <div className="space-y-2">
                      <div className="h-10 bg-zinc-800/50 rounded-md" />
                      <p className="text-xs text-zinc-500">
                        Conecta tu cuenta de ManyChat para automatizar respuestas
                      </p>
                    </div>
                  </ZenCardContent>
                </ZenCard>

                {/* Stripe */}
                <ZenCard className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm z-10" />
                  <ZenCardHeader className="relative">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <ZenCardTitle className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-zinc-500" />
                          <span className="text-base text-zinc-400">Stripe</span>
                          <ZenBadge variant="secondary" className="text-xs">
                            Próximamente
                          </ZenBadge>
                        </ZenCardTitle>
                        <ZenCardDescription>
                          Procesa pagos en línea directamente
                        </ZenCardDescription>
                      </div>
                    </div>
                  </ZenCardHeader>
                  <ZenCardContent>
                    <div className="space-y-2">
                      <div className="h-10 bg-zinc-800/50 rounded-md" />
                      <p className="text-xs text-zinc-500">
                        Acepta pagos con tarjeta de forma segura
                      </p>
                    </div>
                  </ZenCardContent>
                </ZenCard>
              </div>
            </div>

            {/* Info Card - Full width */}
            <ZenCard>
              <ZenCardContent className="pt-6">
                <div className="flex gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 h-fit">
                    <Info className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-medium text-white">¿Dónde se aplican estos códigos?</h3>
                    <ul className="space-y-2 text-sm text-zinc-400">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">•</span>
                        <span>Landing pages de ofertas públicas</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">•</span>
                        <span>Formularios de captación de leads</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">•</span>
                        <span>Páginas de confirmación</span>
                      </li>
                    </ul>
                    <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
                      Los códigos se insertan automáticamente en todas tus páginas públicas para tracking de conversiones y remarketing
                    </p>
                  </div>
                </div>
              </ZenCardContent>
            </ZenCard>
          </div>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
