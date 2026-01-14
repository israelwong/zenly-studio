'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Copy, Check, Eye, TrendingUp, RefreshCw } from 'lucide-react';
import { ZenButton, ZenBadge } from '@/components/ui/zen';
import { PromiseNotesButton } from './PromiseNotesButton';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import { logWhatsAppSent, logProfileShared } from '@/lib/actions/studio/commercial/promises';
import { getOrCreateShortUrl } from '@/lib/actions/studio/commercial/promises/promise-short-url.actions';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { getPromiseViewStats, getCotizacionClickStats, getPaqueteClickStats } from '@/lib/actions/studio/commercial/promises/promise-analytics.actions';
import { toast } from 'sonner';

interface PromiseDetailToolbarProps {
  studioSlug: string;
  promiseId: string | null;
  contactData: {
    contactId: string;
    contactName: string;
    phone: string;
  } | null;
  eventoId?: string | null;
  onCopyLink: () => void;
  onPreview: () => void;
}

export function PromiseDetailToolbar({
  studioSlug,
  promiseId,
  contactData,
  eventoId,
  onPreview,
}: PromiseDetailToolbarProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [statsPopoverOpen, setStatsPopoverOpen] = useState(false);
  const [viewStats, setViewStats] = useState<{
    totalViews: number;
    uniqueViews: number;
    lastView: Date | null;
    recentViews: Array<{ date: Date; ip: string; userAgent: string | null }>;
  } | null>(null);
  const [cotizacionStats, setCotizacionStats] = useState<Array<{
    cotizacionId: string;
    cotizacionName: string;
    clicks: number;
    lastClick: Date | null;
  }>>([]);
  const [paqueteStats, setPaqueteStats] = useState<Array<{
    paqueteId: string;
    paqueteName: string;
    clicks: number;
    lastClick: Date | null;
  }>>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const loadingStatsRef = useRef(false);

  // Función para cargar estadísticas (reutilizable) con timeout
  const loadStats = React.useCallback(async () => {
    if (!promiseId) return;
    
    // Prevenir múltiples llamadas simultáneas usando ref
    if (loadingStatsRef.current) {
      console.debug('[PromiseDetailToolbar] Ya hay una carga en progreso, ignorando...');
      return;
    }

    loadingStatsRef.current = true;
    setLoadingStats(true);
    
    // Timeout de 15 segundos (aumentado para queries optimizadas)
    const timeoutId = setTimeout(() => {
      console.error('[PromiseDetailToolbar] Timeout cargando estadísticas después de 15s');
      loadingStatsRef.current = false;
      setLoadingStats(false);
    }, 15000);

    try {
      const startTime = Date.now();
      const [viewsResult, cotizacionesResult, paquetesResult] = await Promise.all([
        getPromiseViewStats(promiseId),
        getCotizacionClickStats(promiseId),
        getPaqueteClickStats(promiseId),
      ]);
      const duration = Date.now() - startTime;
      console.debug(`[PromiseDetailToolbar] Estadísticas cargadas en ${duration}ms`);

      clearTimeout(timeoutId);

      if (viewsResult.success && viewsResult.data) {
        // Cargar estadísticas completas (incluyendo recentViews)
        setViewStats(viewsResult.data);
      } else {
        console.error('[PromiseDetailToolbar] Error en viewsResult:', viewsResult.error);
        // Establecer valores por defecto si falla (mantener totalViews si ya existe)
        setViewStats((prev) => ({
          totalViews: prev?.totalViews || 0,
          uniqueViews: 0,
          lastView: null,
          recentViews: [],
        }));
      }

      if (cotizacionesResult.success && cotizacionesResult.data) {
        setCotizacionStats(cotizacionesResult.data);
      } else {
        console.error('[PromiseDetailToolbar] Error en cotizacionesResult:', cotizacionesResult.error);
        setCotizacionStats([]);
      }

      if (paquetesResult.success && paquetesResult.data) {
        setPaqueteStats(paquetesResult.data);
      } else {
        console.error('[PromiseDetailToolbar] Error en paquetesResult:', paquetesResult.error);
        setPaqueteStats([]);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[PromiseDetailToolbar] Error loading stats:', error);
      // Establecer valores por defecto en caso de error (mantener totalViews si ya existe)
      setViewStats((prev) => ({
        totalViews: prev?.totalViews || 0,
        uniqueViews: prev?.uniqueViews || 0,
        lastView: prev?.lastView || null,
        recentViews: [],
      }));
      // No resetear cotizacionStats y paqueteStats si ya existen para mantener UI estable
    } finally {
      loadingStatsRef.current = false;
      setLoadingStats(false);
    }
  }, [promiseId]); // Solo depende de promiseId para evitar loops infinitos

  // Cargar estadísticas completas cuando se abre el popover
  useEffect(() => {
    if (statsPopoverOpen && promiseId && !loadingStatsRef.current) {
      loadStats();
    }
  }, [statsPopoverOpen, promiseId, loadStats]);

  if (!promiseId || !contactData) {
    return null;
  }

  const handleWhatsApp = async () => {
    if (!contactData.phone) return;
    
    const cleanPhone = contactData.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${contactData.contactName}`);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;

    if (promiseId) {
      logWhatsAppSent(studioSlug, promiseId, contactData.contactName, contactData.phone).catch((error) => {
        console.error('Error registrando WhatsApp:', error);
      });
    }

    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="flex items-center justify-between gap-1.5 px-6 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-3">
        {/* Estadísticas de visitas */}
        {promiseId && (
          <Popover open={statsPopoverOpen} onOpenChange={setStatsPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
                onClick={() => setStatsPopoverOpen(true)}
              >
                <Eye className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-xs text-zinc-400">Visitas</span>
                {viewStats && viewStats.totalViews > 0 && (
                  <ZenBadge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-[16px]">
                    {viewStats.totalViews}
                  </ZenBadge>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-zinc-950 border-zinc-700/50 p-3 shadow-xl" align="start">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-zinc-400" />
                    Estadísticas
                  </h3>
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={loadStats}
                    disabled={loadingStats}
                    className="h-5 px-1.5 text-[10px]"
                    title="Actualizar estadísticas"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingStats ? 'animate-spin' : ''}`} />
                  </ZenButton>
                </div>

                {/* Skeleton o contenido */}
                {loadingStats ? (
                  <div className="space-y-3">
                    {/* Skeleton para estadísticas principales */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="h-2.5 w-12 bg-zinc-800/50 rounded animate-pulse" />
                        <div className="h-5 w-8 bg-zinc-800/50 rounded animate-pulse" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2.5 w-12 bg-zinc-800/50 rounded animate-pulse" />
                        <div className="h-5 w-8 bg-zinc-800/50 rounded animate-pulse" />
                      </div>
                    </div>
                    {/* Skeleton para lista */}
                    <div className="space-y-1.5">
                      <div className="h-3 w-24 bg-zinc-800/50 rounded animate-pulse" />
                      {[1, 2].map((i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="h-3 w-32 bg-zinc-800/50 rounded animate-pulse" />
                          <div className="h-4 w-6 bg-zinc-800/50 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Estadísticas de visitas */}
                    {viewStats ? (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="bg-zinc-800/30 rounded-md p-2">
                            <div className="text-[10px] text-zinc-500 mb-1">Total</div>
                            <div className="text-base font-semibold text-white">{viewStats.totalViews}</div>
                          </div>
                          <div className="bg-zinc-800/30 rounded-md p-2">
                            <div className="text-[10px] text-zinc-500 mb-1">Únicas</div>
                            <div className="text-base font-semibold text-white">{viewStats.uniqueViews}</div>
                          </div>
                        </div>
                        {viewStats.lastView && (
                          <div className="bg-zinc-800/30 rounded-md p-2">
                            <div className="text-[10px] text-zinc-500 mb-1">Última visita</div>
                            <div className="text-xs text-zinc-300">
                              {formatDate(viewStats.lastView, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500 text-center py-2">Sin visitas aún</div>
                    )}

                    {/* Lista de paquetes con clicks */}
                    {paqueteStats.length > 0 && (
                      <div className="border-t border-zinc-800 pt-2.5">
                        <h4 className="text-[10px] font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">Paquetes</h4>
                        <div className="space-y-1">
                          {paqueteStats.map((stat) => (
                            <div key={stat.paqueteId} className="flex items-center justify-between text-xs group">
                              <span className="text-zinc-300 truncate flex-1 text-[11px]">{stat.paqueteName}</span>
                              <ZenBadge variant="secondary" className="ml-2 shrink-0 text-[10px] px-1.5 py-0 h-4 min-w-[20px]">
                                {stat.clicks}
                              </ZenBadge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lista de cotizaciones con clicks */}
                    {cotizacionStats.length > 0 && (
                      <div className="border-t border-zinc-800 pt-2.5">
                        <h4 className="text-[10px] font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">Cotizaciones</h4>
                        <div className="space-y-1">
                          {cotizacionStats.map((stat) => (
                            <div key={stat.cotizacionId} className="flex items-center justify-between text-xs group">
                              <span className="text-zinc-300 truncate flex-1 text-[11px]">{stat.cotizacionName}</span>
                              <ZenBadge variant="secondary" className="ml-2 shrink-0 text-[10px] px-1.5 py-0 h-4 min-w-[20px]">
                                {stat.clicks}
                              </ZenBadge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
        {/* Grupo: Compartir */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 font-medium">Compartir</span>
          {/* Botón Copiar URL */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (!promiseId) return;
              
              try {
                // Obtener o crear URL corta
                const result = await getOrCreateShortUrl(studioSlug, promiseId);
                
                if (!result.success || !result.data) {
                  toast.error('Error al generar URL corta');
                  return;
                }

                const shortUrl = `${window.location.origin}/s/${result.data.shortCode}`;
                
                // Copiar al portapapeles
                await navigator.clipboard.writeText(shortUrl);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
                
                // Registrar log
                if (contactData) {
                  logProfileShared(studioSlug, promiseId, contactData.contactName, shortUrl).catch((error) => {
                    console.error('Error registrando copia de URL:', error);
                  });
                }
              } catch (error) {
                console.error('Error copiando URL:', error);
                toast.error('Error al copiar URL');
              }
            }}
            className={`gap-1.5 px-2.5 py-1.5 h-7 text-xs ${linkCopied ? 'bg-emerald-500/20 text-emerald-400' : ''}`}
          >
            {linkCopied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar URL</span>
              </>
            )}
          </ZenButton>

          {/* Botón Vista previa */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => {
              onPreview();
              
              // Registrar log
              if (promiseId && contactData) {
                const previewUrl = `${window.location.origin}/${studioSlug}/promise/${promiseId}?preview=true`;
                logProfileShared(studioSlug, promiseId, contactData.contactName, previewUrl).catch((error) => {
                  console.error('Error registrando vista previa:', error);
                });
              }
            }}
            className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Vista previa</span>
          </ZenButton>
        </div>

        {/* Divisor entre Compartir y Contactar */}
        {contactData.phone && (
          <div className="h-4 w-px bg-zinc-700" />
        )}

        {/* Grupo: Contactar */}
        {contactData.phone && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 font-medium">Contactar</span>
            {/* Botón WhatsApp */}
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={handleWhatsApp}
              className="gap-1.5 px-2.5 py-1.5 h-7 text-xs hover:bg-emerald-500/10 hover:text-emerald-400"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" size={14} />
              <span>WhatsApp</span>
            </ZenButton>
          </div>
        )}

      </div>

      {/* Botón de bitácora alineado a la derecha */}
      <PromiseNotesButton
        studioSlug={studioSlug}
        promiseId={promiseId}
        contactId={contactData.contactId}
      />
    </div>
  );
}

