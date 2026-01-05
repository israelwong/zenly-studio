'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MoreVertical, Eye, Edit, X, Loader2, CheckCircle2, Users, Download } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
  ZenConfirmModal,
  ZenDialog,
  ZenAvatar,
  ZenAvatarFallback,
  ZenBadge,
} from '@/components/ui/zen';
import { formatNumber, formatDate } from '@/lib/actions/utils/formatting';
import { cancelarCotizacion, cancelarCotizacionYEvento, getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { ResumenCotizacion } from '@/components/shared/cotizaciones';
import { ResumenCotizacionAutorizada, type CotizacionItem as ResumenCotizacionItem } from './ResumenCotizacionAutorizada';
import { AutorizarRevisionModal } from './AutorizarRevisionModal';
import { InfoCrearRevisionModal } from './InfoCrearRevisionModal';
import { toast } from 'sonner';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';

// Helper para formatear montos con separadores de miles
const formatAmount = (amount: number): string => {
  return `$${formatNumber(amount, 2)}`;
};

// Helper para obtener iniciales
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Tipo extendido con items y relaciones
type CotizacionAprobada = NonNullable<EventoDetalle['cotizaciones']>[number];
type CotizacionItem = NonNullable<CotizacionAprobada['cotizacion_items']>[number];

interface EventCotizacionesCardProps {
  studioSlug: string;
  eventId: string;
  promiseId?: string | null;
  cotizaciones?: EventoDetalle['cotizaciones'];
  onUpdated?: () => void;
}

// Stats calculados por cotización
interface CotizacionStats {
  totalItems: number;
  completedTasks: number;
  totalTasks: number;
  assignedCrew: number;
  totalRequiringCrew: number;
  crewMembers: Array<{
    id: string;
    name: string;
    tipo: string;
  }>;
}

// Calcular stats de una cotización
const calculateCotizacionStats = (cotizacion: CotizacionAprobada | undefined): CotizacionStats => {
  if (!cotizacion?.cotizacion_items) {
    return {
      totalItems: 0,
      completedTasks: 0,
      totalTasks: 0,
      assignedCrew: 0,
      totalRequiringCrew: 0,
      crewMembers: [],
    };
  }

  const items = cotizacion.cotizacion_items as CotizacionItem[] | undefined;
  if (!items) {
    return {
      totalItems: 0,
      completedTasks: 0,
      totalTasks: 0,
      assignedCrew: 0,
      totalRequiringCrew: 0,
      crewMembers: [],
    };
  }

  const totalItems = items.length;

  // Items con tarea del scheduler
  const itemsWithTasks = items.filter((item) => item.scheduler_task);
  const totalTasks = itemsWithTasks.length;
  const completedTasks = itemsWithTasks.filter((item) => item.scheduler_task?.completed_at).length;

  // Items que requieren crew (típicamente servicios operativos)
  const itemsRequiringCrew = items.filter((item) =>
    item.profit_type === 'servicio' || item.profit_type_snapshot === 'servicio'
  );
  const totalRequiringCrew = itemsRequiringCrew.length;
  const assignedCrew = itemsRequiringCrew.filter((item) => item.assigned_to_crew_member_id).length;

  // Crew members únicos
  const crewMap = new Map<string, { id: string; name: string; tipo: string }>();
  items.forEach((item) => {
    if (item.assigned_to_crew_member) {
      crewMap.set(item.assigned_to_crew_member.id, {
        id: item.assigned_to_crew_member.id,
        name: item.assigned_to_crew_member.name,
        tipo: item.assigned_to_crew_member.tipo,
      });
    }
  });

  return {
    totalItems,
    completedTasks,
    totalTasks,
    assignedCrew,
    totalRequiringCrew,
    crewMembers: Array.from(crewMap.values()),
  };
};

export function EventCotizacionesCard({
  studioSlug,
  eventId,
  promiseId,
  cotizaciones,
  onUpdated,
}: EventCotizacionesCardProps) {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelandoCotizacionId, setCancelandoCotizacionId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [loadingCotizacionId, setLoadingCotizacionId] = useState<string | null>(null);
  const [cotizacionCompleta, setCotizacionCompleta] = useState<CotizacionAprobada | null>(null);
  const [showInfoCrearRevisionModal, setShowInfoCrearRevisionModal] = useState(false);
  const [cotizacionParaRevision, setCotizacionParaRevision] = useState<CotizacionAprobada | null>(null);
  const [showAutorizarRevisionModal, setShowAutorizarRevisionModal] = useState(false);
  const [revisionParaAutorizar, setRevisionParaAutorizar] = useState<CotizacionAprobada | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Debug: Log para ver qué cotizaciones estamos recibiendo
  React.useEffect(() => {
    console.log('[EventCotizacionesCard] Cotizaciones recibidas:', {
      total: cotizaciones?.length || 0,
      cotizaciones: cotizaciones?.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
      })),
    });
  }, [cotizaciones]);

  const cotizacionesAprobadas = (cotizaciones || []).filter(
    (c) => c.status === 'autorizada' || c.status === 'aprobada' || c.status === 'approved'
  ) as CotizacionAprobada[];

  // Debug: Log para ver qué cotizaciones pasaron el filtro
  React.useEffect(() => {
    console.log('[EventCotizacionesCard] Cotizaciones aprobadas:', {
      total: cotizacionesAprobadas.length,
      cotizaciones: cotizacionesAprobadas.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
      })),
    });
  }, [cotizacionesAprobadas]);

  // Separar cotizaciones activas de revisiones pendientes
  const cotizacionesActivas = cotizacionesAprobadas.filter(
    (c) => !c.revision_status || c.revision_status === 'active'
  );
  const revisionesPendientes = (cotizaciones || []).filter(
    (c) => c.revision_status === 'pending_revision' && c.status === 'pendiente'
  ) as CotizacionAprobada[];

  // Calcular total a pagar considerando descuentos (solo cotizaciones activas)
  const totalAprobado = cotizacionesActivas.reduce((sum, c) => {
    const totalPagar = Number(c.price) - (c.discount ? Number(c.discount) : 0);
    return sum + totalPagar;
  }, 0);

  const handleCrearRevision = (cotizacion: CotizacionAprobada) => {
    setCotizacionParaRevision(cotizacion);
    setShowInfoCrearRevisionModal(true);
  };

  const handleAutorizarRevision = (revision: CotizacionAprobada) => {
    setRevisionParaAutorizar(revision);
    setShowAutorizarRevisionModal(true);
  };

  const handleRevisionAutorizada = () => {
    setShowAutorizarRevisionModal(false);
    setRevisionParaAutorizar(null);
    onUpdated?.();
  };


  const handleGestionarScheduler = (cotizacionId?: string) => {
    if (cotizacionId) {
      router.push(`/${studioSlug}/studio/business/events/${eventId}/scheduler?cotizacion=${cotizacionId}`);
    } else {
      router.push(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    }
  };

  const handleVer = (cotizacion: CotizacionAprobada) => {
    // Usar datos directamente de la cotización que ya tenemos
    // Si tiene cotizacion_items, es autorizada y usamos ResumenCotizacionAutorizada
    // Si no, cargamos datos básicos y usamos ResumenCotizacion
    if (cotizacion.cotizacion_items && cotizacion.cotizacion_items.length > 0) {
      // Cotización autorizada: usar datos guardados directamente
      setCotizacionCompleta(cotizacion);
      setShowViewModal(true);
    } else {
      // Cotización no autorizada: cargar datos básicos para ResumenCotizacion
      setLoadingCotizacionId(cotizacion.id);
      getCotizacionById(cotizacion.id, studioSlug)
        .then((result) => {
          if (result.success && result.data) {
            setCotizacionCompleta({
              ...cotizacion,
              description: result.data.description,
            } as CotizacionAprobada);
            setShowViewModal(true);
          } else {
            toast.error(result.error || 'Error al cargar la cotización');
          }
        })
        .catch((error) => {
          console.error('Error loading cotizacion:', error);
          toast.error('Error al cargar la cotización');
        })
        .finally(() => {
          setLoadingCotizacionId(null);
        });
    }
  };

  const handleEditarDesdeModal = () => {
    if (!cotizacionCompleta) return;
    const cotizacion = cotizacionesAprobadas.find((c) => c.id === cotizacionCompleta.id);
    if (cotizacion && cotizacion.promise_id) {
      setShowViewModal(false);
      handleEditar(cotizacion);
    }
  };

  const handleDownloadPDF = async () => {
    if (!cotizacionCompleta || !printableRef.current) return;

    setGeneratingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      // Clonar el contenido
      const clone = printableRef.current.cloneNode(true) as HTMLElement;

      // Expandir todos los acordeones: remover botones y mostrar contenido
      const acordeonButtons = clone.querySelectorAll('button[class*="hover:bg-zinc-800"]');
      acordeonButtons.forEach(button => {
        const parent = button.parentElement;
        if (parent) {
          // Buscar el contenido colapsado (div con border-t que está oculto)
          const contenidoColapsado = parent.querySelector('div[class*="border-t"]');
          if (contenidoColapsado) {
            // Remover el botón del acordeón
            button.remove();
            // Asegurar que el contenido esté visible
            (contenidoColapsado as HTMLElement).style.display = 'block';
          }
        }
      });

      // Remover todos los chevrons (iconos SVG)
      const svgs = clone.querySelectorAll('svg');
      svgs.forEach(svg => {
        // Remover chevrons (ChevronDown, ChevronRight)
        const path = svg.querySelector('path');
        if (path && (path.getAttribute('d')?.includes('M9 18l6-6-6-6') || path.getAttribute('d')?.includes('M6 9l6 6 6-6'))) {
          svg.remove();
        }
      });

      // Remover todos los botones restantes
      const remainingButtons = clone.querySelectorAll('button');
      remainingButtons.forEach(btn => btn.remove());

      // Remover clases de Tailwind
      const allElements = clone.querySelectorAll('*');
      allElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.removeAttribute('class');
        htmlEl.removeAttribute('data-tailwind');
      });

      // Aplicar estilos profesionales para PDF
      // 1. Estilizar secciones (divs principales que contienen secciones)
      const seccionesDivs = clone.querySelectorAll('div');
      seccionesDivs.forEach((div, index) => {
        const htmlDiv = div as HTMLElement;
        const text = htmlDiv.textContent || '';

        // Detectar secciones por estructura (divs que contienen otros divs con texto corto)
        const childDivs = htmlDiv.querySelectorAll('div');
        if (childDivs.length > 0 && text.length < 100 && !htmlDiv.querySelector('span[style*="color"]')) {
          htmlDiv.style.marginTop = '20px';
          htmlDiv.style.marginBottom = '12px';
          htmlDiv.style.padding = '12px';
          htmlDiv.style.border = '1px solid #e5e7eb';
          htmlDiv.style.borderRadius = '4px';
          htmlDiv.style.backgroundColor = '#f9fafb';
        }
      });

      // 2. Estilizar spans (nombres, cantidades, precios)
      const spans = clone.querySelectorAll('span');
      spans.forEach(span => {
        const htmlSpan = span as HTMLElement;
        const text = htmlSpan.textContent || '';

        // Cantidades (x2, x3, etc)
        if (text.startsWith('x') && /^x\d+$/.test(text)) {
          htmlSpan.style.fontSize = '12px';
          htmlSpan.style.color = '#6b7280';
          htmlSpan.style.fontWeight = '500';
        }
        // Precios (contienen $)
        else if (text.includes('$')) {
          htmlSpan.style.fontSize = '13px';
          htmlSpan.style.color = '#111827';
          htmlSpan.style.fontWeight = '600';
        }
        // Nombres de items (texto largo)
        else if (text.length > 10 && !text.includes('$') && !text.startsWith('x')) {
          htmlSpan.style.fontSize = '13px';
          htmlSpan.style.color = '#111827';
        }
        // Títulos de sección/categoría (texto corto, sin números)
        else if (text.length < 50 && !/\d/.test(text)) {
          htmlSpan.style.fontSize = '14px';
          htmlSpan.style.fontWeight = '600';
          htmlSpan.style.color = '#374151';
        }
      });

      // 3. Remover cualquier color esmeralda restante
      allElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        const color = htmlEl.style.color;
        if (color && (color.includes('emerald') || color === 'rgb(16, 185, 129)' || color === '#10b981')) {
          htmlEl.style.color = '#111827';
        }
      });

      // Crear iframe aislado
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '210mm';
      iframe.style.height = '297mm';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      // Escribir HTML con estilos profesionales (similar a PaymentReceipt)
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="margin: 0; padding: 32px; width: 210mm; min-height: 297mm; background: white; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12pt; line-height: 1.6;">
          <div style="max-width: 100%;">
            <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb;">
              ${cotizacionCompleta.name || 'Cotización'}
            </h1>
            ${clone.innerHTML}
          </div>
        </body>
        </html>
      `);
      iframeDoc.close();

      // Esperar a que el iframe se renderice
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        foreignObjectRendering: false
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);

      const filename = `cotizacion-${cotizacionCompleta.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${cotizacionCompleta.id.slice(0, 8)}.pdf`;
      pdf.save(filename);

      toast.success('PDF generado correctamente');
      document.body.removeChild(iframe);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleEditar = (cotizacion: CotizacionAprobada) => {
    if (!cotizacion.promise_id) {
      toast.error('No hay promesa asociada');
      return;
    }

    // Si la cotización está autorizada/aprobada, redirigir a crear revisión en lugar de editar
    // porque updateCotizacion() bloquea edición de cotizaciones autorizadas
    if (cotizacion.status === 'aprobada' || cotizacion.status === 'autorizada' || cotizacion.status === 'approved') {
      // Si no tiene revision_status o es 'active', sugerir crear revisión
      if (!cotizacion.revision_status || cotizacion.revision_status === 'active') {
        handleCrearRevision(cotizacion);
        return;
      }
    }

    router.push(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}/cotizacion/${cotizacion.id}`);
  };

  const handleCancelarClick = (cotizacionId: string) => {
    setCancelandoCotizacionId(cotizacionId);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancelandoCotizacionId) return;

    setIsCancelling(true);
    try {
      const esUnicaCotizacion = cotizacionesAprobadas.length === 1;

      let result;
      if (esUnicaCotizacion) {
        // Cancelar cotización y evento
        result = await cancelarCotizacionYEvento(studioSlug, cancelandoCotizacionId);
      } else {
        // Solo cancelar cotización
        result = await cancelarCotizacion(studioSlug, cancelandoCotizacionId);
      }

      if (result.success) {
        toast.success('Cotización cancelada correctamente');
        setShowCancelModal(false);
        setCancelandoCotizacionId(null);
        onUpdated?.();

        // Si se canceló el evento, redirigir a lista de eventos
        if (esUnicaCotizacion) {
          router.push(`/${studioSlug}/studio/business/events`);
        }
      } else {
        toast.error(result.error || 'Error al cancelar cotización');
      }
    } catch (error) {
      console.error('Error cancelando cotización:', error);
      toast.error('Error al cancelar cotización');
    } finally {
      setIsCancelling(false);
    }
  };

  const cotizacionACancelar = cancelandoCotizacionId
    ? cotizacionesAprobadas.find((c) => c.id === cancelandoCotizacionId)
    : null;
  const esUnicaCotizacion = cotizacionesAprobadas.length === 1;

  return (
    <ZenCard>
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            Cotización
          </ZenCardTitle>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        <div className="space-y-4">
          {/* Lista de cotizaciones */}
          {cotizacionesAprobadas.length > 0 ? (
            <>
              <div className="space-y-3">
                {cotizacionesAprobadas.map((cotizacion) => {
                  const isMenuOpen = openMenuId === cotizacion.id;
                  const isLoading = loadingCotizacionId === cotizacion.id;
                  const stats = calculateCotizacionStats(cotizacion);

                  return (
                    <div
                      key={cotizacion.id}
                      className="p-3 bg-zinc-900 rounded border border-zinc-800 relative group hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 pr-8">
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleVer(cotizacion)}
                        >
                          <p className="text-sm font-medium text-zinc-100 truncate mb-1">
                            {cotizacion.name}
                          </p>

                          {/* Balance compacto */}
                          <div className="space-y-0.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Total:</span>
                              <span className="text-zinc-300">{formatAmount(cotizacion.price)}</span>
                            </div>
                            
                            {/* Desglose de condiciones comerciales usando snapshots */}
                            {(() => {
                              // Usar snapshots de condiciones comerciales (inmutables)
                              const condicionSnapshot = {
                                name: cotizacion.condiciones_comerciales_name_snapshot,
                                description: cotizacion.condiciones_comerciales_description_snapshot,
                                advance_percentage: cotizacion.condiciones_comerciales_advance_percentage_snapshot != null
                                  ? Number(cotizacion.condiciones_comerciales_advance_percentage_snapshot)
                                  : null,
                                advance_type: cotizacion.condiciones_comerciales_advance_type_snapshot,
                                advance_amount: cotizacion.condiciones_comerciales_advance_amount_snapshot != null
                                  ? Number(cotizacion.condiciones_comerciales_advance_amount_snapshot)
                                  : null,
                                discount_percentage: cotizacion.condiciones_comerciales_discount_percentage_snapshot != null
                                  ? Number(cotizacion.condiciones_comerciales_discount_percentage_snapshot)
                                  : null,
                              };

                              const precioBase = cotizacion.price;
                              
                              // Calcular descuento
                              const descuentoMonto = condicionSnapshot.discount_percentage
                                ? precioBase * (condicionSnapshot.discount_percentage / 100)
                                : (cotizacion.discount || 0);
                              
                              const subtotal = precioBase - descuentoMonto;
                              
                              // Calcular anticipo
                              let anticipoMonto = 0;
                              if (condicionSnapshot.advance_type === 'fixed_amount' && condicionSnapshot.advance_amount) {
                                anticipoMonto = Number(condicionSnapshot.advance_amount);
                              } else if (condicionSnapshot.advance_type === 'percentage' && condicionSnapshot.advance_percentage) {
                                anticipoMonto = subtotal * (condicionSnapshot.advance_percentage / 100);
                              }
                              
                              const diferido = subtotal - anticipoMonto;

                              return (
                                <>
                                  {descuentoMonto > 0 && (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-zinc-500">Descuento:</span>
                                        <span className="text-red-400">-{formatAmount(descuentoMonto)}</span>
                                      </div>
                                      <div className="flex justify-between pt-0.5 border-t border-zinc-800">
                                        <span className="text-zinc-400 font-medium">Subtotal:</span>
                                        <span className="text-zinc-300 font-medium">{formatAmount(subtotal)}</span>
                                      </div>
                                    </>
                                  )}
                                  {anticipoMonto > 0 && (
                                    <>
                                      <div className={`flex justify-between ${descuentoMonto > 0 ? '' : 'pt-0.5 border-t border-zinc-800'}`}>
                                        <span className="text-zinc-500">
                                          Anticipo {condicionSnapshot.advance_type === 'fixed_amount' 
                                            ? '(monto fijo)' 
                                            : condicionSnapshot.advance_percentage 
                                              ? `(${condicionSnapshot.advance_percentage}%)` 
                                              : ''}:
                                        </span>
                                        <span className="text-emerald-400 font-medium">{formatAmount(anticipoMonto)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-zinc-500">Diferido:</span>
                                        <span className="text-amber-400 font-medium">{formatAmount(diferido)}</span>
                                      </div>
                                    </>
                                  )}
                                  {anticipoMonto === 0 && descuentoMonto === 0 && (
                                    <div className="flex justify-between pt-0.5 border-t border-zinc-800">
                                      <span className="text-emerald-400 font-medium">A pagar:</span>
                                      <span className="text-emerald-400 font-medium">
                                        {formatAmount(precioBase)}
                                      </span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          <p className="text-xs text-zinc-600 mt-1.5">
                            {formatDate(cotizacion.updated_at)}
                          </p>
                        </div>

                        {/* Menú dropdown */}
                        <div className="absolute top-2 right-2">
                          <ZenDropdownMenu
                            open={isMenuOpen}
                            onOpenChange={(open) => setOpenMenuId(open ? cotizacion.id : null)}
                          >
                            <ZenDropdownMenuTrigger asChild>
                              <ZenButton
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-zinc-400 hover:text-zinc-300"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </ZenButton>
                            </ZenDropdownMenuTrigger>
                            <ZenDropdownMenuContent align="end">
                              <ZenDropdownMenuItem
                                onClick={() => {
                                  handleVer(cotizacion);
                                  setOpenMenuId(null);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver
                              </ZenDropdownMenuItem>
                              <ZenDropdownMenuSeparator />
                              <ZenDropdownMenuItem
                                onClick={() => {
                                  handleEditar(cotizacion);
                                  setOpenMenuId(null);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </ZenDropdownMenuItem>
                              <ZenDropdownMenuSeparator />
                              <ZenDropdownMenuItem
                                onClick={() => {
                                  handleCancelarClick(cotizacion.id);
                                  setOpenMenuId(null);
                                }}
                                className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                              </ZenDropdownMenuItem>
                            </ZenDropdownMenuContent>
                          </ZenDropdownMenu>
                        </div>
                      </div>

                      {/* Footer con botón de cronograma */}
                      <div className="mt-3 pt-3 border-t border-zinc-800">
                        <div className="flex items-center justify-between gap-2">
                          <ZenButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGestionarScheduler(cotizacion.id)}
                            className="flex-1 h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/20 gap-1.5"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            Gestionar cronograma
                          </ZenButton>
                          <span className="text-xs text-zinc-500 shrink-0">
                            ({stats.totalTasks} de {stats.totalItems})
                          </span>
                        </div>
                      </div>

                      {/* Spinner de carga */}
                      {isLoading && (
                        <div className="absolute inset-0 bg-zinc-900/90 rounded flex items-center justify-center gap-2 z-10">
                          <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                          <span className="text-xs text-emerald-400 font-medium">
                            Generando vista previa
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Revisiones pendientes */}
              {revisionesPendientes.length > 0 && (
                <div className="mt-6 pt-4 border-t border-zinc-800">
                  <p className="text-xs font-medium text-zinc-400 mb-3">Revisiones Pendientes</p>
                  <div className="space-y-3">
                    {revisionesPendientes.map((revision) => {
                      const isMenuOpen = openMenuId === revision.id;
                      return (
                        <div
                          key={revision.id}
                          className="flex items-start gap-4 p-4 pr-12 bg-blue-950/20 rounded border border-blue-500/30 relative group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <ZenBadge variant="outline" className="text-xs text-blue-400 border-blue-500/50">
                                Revisión #{revision.revision_number || 1}
                              </ZenBadge>
                              <p className="text-sm font-medium text-zinc-100 truncate">
                                {revision.name}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400">Precio:</span>
                                <span className="text-zinc-300">{formatAmount(revision.price)}</span>
                              </div>
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">
                              Pendiente de autorización
                            </p>
                          </div>
                          {/* Menú dropdown para revisiones */}
                          <div className="absolute top-3 right-3 z-20">
                            <ZenDropdownMenu
                              open={isMenuOpen}
                              onOpenChange={(open) => setOpenMenuId(open ? revision.id : null)}
                            >
                              <ZenDropdownMenuTrigger asChild>
                                <ZenButton
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-zinc-400 hover:text-zinc-300"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </ZenButton>
                              </ZenDropdownMenuTrigger>
                              <ZenDropdownMenuContent align="end">
                                <ZenDropdownMenuItem
                                  onClick={() => {
                                    handleVer(revision);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver
                                </ZenDropdownMenuItem>
                                {promiseId && (
                                  <>
                                    <ZenDropdownMenuSeparator />
                                    <ZenDropdownMenuItem
                                      onClick={() => {
                                        handleAutorizarRevision(revision);
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Autorizar Revisión
                                    </ZenDropdownMenuItem>
                                  </>
                                )}
                              </ZenDropdownMenuContent>
                            </ZenDropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-zinc-500 mb-2">
                No hay cotizaciones aprobadas
              </p>
              {!promiseId && (
                <p className="text-xs text-zinc-600">
                  Asocia una promesa para ver cotizaciones
                </p>
              )}
            </div>
          )}

        </div>
      </ZenCardContent>

      {/* Modal de confirmación para cancelar */}
      {
        showCancelModal && cotizacionACancelar && (
          <ZenConfirmModal
            isOpen={showCancelModal}
            onClose={() => {
              if (!isCancelling) {
                setShowCancelModal(false);
                setCancelandoCotizacionId(null);
              }
            }}
            onConfirm={handleCancelConfirm}
            title="Cancelar cotización"
            description={
              esUnicaCotizacion
                ? '¿Deseas cancelar la cotización y el evento?'
                : 'Solo se cancelará la cotización seleccionada pero el evento se mantendrá activo porque existen cotizaciones aprobadas.'
            }
            confirmText="Cancelar cotización"
            cancelText="No cancelar"
            variant="destructive"
            loading={isCancelling}
            loadingText="Cancelando..."
          />
        )
      }

      {/* Modal para ver resumen de cotización */}
      {
        showViewModal && cotizacionCompleta && (
          <ZenDialog
            isOpen={showViewModal}
            onClose={() => {
              setShowViewModal(false);
              setCotizacionCompleta(null);
            }}
            title="Resumen de Cotización"
            maxWidth="5xl"
          >
            <div ref={printableRef}>
              {cotizacionCompleta.cotizacion_items && cotizacionCompleta.cotizacion_items.length > 0 ? (
                // Cotización autorizada: mostrar datos guardados
                <ResumenCotizacionAutorizada
                  cotizacion={{
                    id: cotizacionCompleta.id,
                    name: cotizacionCompleta.name,
                    description: null, // Los items tienen su propia descripción
                    price: cotizacionCompleta.price,
                    discount: cotizacionCompleta.discount,
                    status: cotizacionCompleta.status,
                    cotizacion_items: cotizacionCompleta.cotizacion_items as ResumenCotizacionItem[],
                  }}
                  studioSlug={studioSlug}
                  promiseId={cotizacionCompleta.promise_id || undefined}
                  onEditar={undefined}
                />
              ) : (
                // Cotización no autorizada: usar componente original que carga catálogo
                <ResumenCotizacion
                  cotizacion={{
                    id: cotizacionCompleta.id,
                    name: cotizacionCompleta.name,
                    description: null, // No disponible en EventoDetalle
                    price: cotizacionCompleta.price,
                    status: cotizacionCompleta.status,
                    items: (cotizacionCompleta.cotizacion_items?.map((item) => ({
                      item_id: item.item_id || '',
                      quantity: item.quantity,
                      unit_price: item.unit_price,
                      subtotal: item.subtotal,
                      cost: item.cost,
                      expense: 0, // No disponible en EventoDetalle
                      name: item.name,
                      description: item.description,
                      category_name: item.category_name,
                      seccion_name: item.seccion_name,
                    })) || []) as Array<{
                      item_id: string;
                      quantity: number;
                      unit_price: number;
                      subtotal: number;
                      cost: number;
                      expense: number;
                      name: string | null;
                      description: string | null;
                      category_name: string | null;
                      seccion_name: string | null;
                    }>,
                  }}
                  studioSlug={studioSlug}
                  promiseId={cotizacionCompleta.promise_id || undefined}
                  onEditar={undefined}
                />
              )}
            </div>
          </ZenDialog>
        )
      }

      {/* Modal informativo que crea revisión directamente */}
      {
        cotizacionParaRevision && (
          <InfoCrearRevisionModal
            isOpen={showInfoCrearRevisionModal}
            onClose={() => {
              setShowInfoCrearRevisionModal(false);
              setCotizacionParaRevision(null);
            }}
            onConfirm={() => {
              setShowInfoCrearRevisionModal(false);
              setCotizacionParaRevision(null);
              onUpdated?.();
            }}
            cotizacion={cotizacionParaRevision}
            studioSlug={studioSlug}
          />
        )
      }

      {/* Modal para autorizar revisión */}
      {
        revisionParaAutorizar && promiseId && (
          <AutorizarRevisionModal
            isOpen={showAutorizarRevisionModal}
            onClose={() => {
              setShowAutorizarRevisionModal(false);
              setRevisionParaAutorizar(null);
            }}
            studioSlug={studioSlug}
            revision={revisionParaAutorizar}
            promiseId={promiseId}
            onSuccess={handleRevisionAutorizada}
          />
        )
      }
    </ZenCard >
  );
}

