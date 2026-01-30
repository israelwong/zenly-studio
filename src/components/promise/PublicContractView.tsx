'use client';

import { useState, useRef, useEffect, useCallback, startTransition } from 'react';
import { FileText, CheckCircle2, Edit2, Download, Loader2 } from 'lucide-react';
import { ZenDialog, ZenButton, ZenBadge } from '@/components/ui/zen';
import { ContractPreview } from '@/components/shared/contracts/ContractPreview';
import type { EventContractData } from '@/types/contracts';
import type { CondicionesComercialesData } from '@/app/[slug]/studio/config/contratos/components/types';
import { signPublicContract } from '@/lib/actions/public/contracts.actions';
import { toast } from 'sonner';
import { generatePDFFromElement } from '@/lib/utils/pdf-generator';
import { formatMoney } from '@/lib/utils/package-price-formatter';
import { formatDisplayDateLong } from '@/lib/utils/date-formatter';
import { toUtcDateOnly } from '@/lib/utils/date-only';

interface PublicContractViewProps {
  isOpen: boolean;
  onClose: () => void;
  onContractSigned?: () => void;
  onContractSignedOptimistic?: () => void;
  onContractSignedRollback?: () => void;
  cotizacionId: string;
  promiseId: string;
  studioSlug: string;
  contractContent: string | null;
  contractTemplateId?: string | null;
  contractVersion?: number;
  condicionesComerciales: {
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type: string | null;
    advance_amount: number | null;
    discount_percentage: number | null;
  } | null;
  promise: {
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    event_type_name: string | null;
    event_date: Date | null;
    event_location: string | null;
    event_name: string | null;
  };
  studio: {
    studio_name: string;
    representative_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  /** Totales del engine (SSoT). Si no se pasan, se usa cotizacionPrice como fallback solo para total. */
  totalAPagar?: number;
  anticipo?: number;
  diferido?: number;
  descuentoAplicado?: number;
  /** Fallback cuando totalAPagar no viene del servidor (datos legacy). */
  cotizacionPrice: number;
  isSigned: boolean;
  eventTypeId?: string | null;
}

export function PublicContractView({
  isOpen,
  onClose,
  onContractSigned,
  onContractSignedOptimistic,
  onContractSignedRollback,
  cotizacionId,
  promiseId,
  studioSlug,
  contractContent,
  contractTemplateId,
  contractVersion,
  condicionesComerciales,
  promise,
  studio,
  totalAPagar: totalAPagarProp,
  anticipo: anticipoProp,
  diferido: diferidoProp,
  descuentoAplicado: descuentoAplicadoProp,
  cotizacionPrice,
  isSigned,
  eventTypeId,
}: PublicContractViewProps) {
  const totalAPagar = totalAPagarProp ?? cotizacionPrice;
  const anticipo = anticipoProp ?? 0;
  const diferido = diferidoProp ?? 0;
  const descuentoAplicado = descuentoAplicadoProp ?? 0;
  const [isSigning, setIsSigning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showSignConfirmModal, setShowSignConfirmModal] = useState(false);
  const [loadingContract, setLoadingContract] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [renderedContent, setRenderedContent] = useState<string | null>(contractContent);
  const [eventData, setEventData] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Limpiar estado de firma cuando el contrato deja de estar firmado (p. ej. regenerado por el estudio)
  useEffect(() => {
    if (!isSigned) {
      setIsSigning(false);
      setIsSuccess(false);
      setShowSignConfirmModal(false);
    }
  }, [isSigned]);

  // Detectar si es mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Memoizar funciones de carga para evitar recrearlas en cada render
  const loadPromiseData = useCallback(async () => {
    setLoadingData(true);
    try {
      const { getPromiseContractData } = await import('@/lib/actions/studio/business/contracts/renderer.actions');
      const result = await getPromiseContractData(
        studioSlug,
        promiseId,
        cotizacionId,
        condicionesComerciales || undefined
      );

      if (result.success && result.data) {
        setEventData(result.data);
      }
    } catch (error) {
      console.error('[loadPromiseData] Error:', error);
    } finally {
      setLoadingData(false);
    }
  }, [studioSlug, promiseId, cotizacionId, condicionesComerciales]);

  const loadContractFromTemplate = useCallback(async () => {
    setLoadingContract(true);
    setLoadingData(true);
    try {
      // Importar dinámicamente las funciones del servidor
      const { getContractTemplate } = await import('@/lib/actions/studio/business/contracts/templates.actions');
      const { getPromiseContractData } = await import('@/lib/actions/studio/business/contracts/renderer.actions');

      // Cargar plantilla
      const templateResult = await getContractTemplate(studioSlug, contractTemplateId!);
      if (!templateResult.success || !templateResult.data) {
        toast.error('Error al cargar la plantilla del contrato');
        return;
      }

      const template = templateResult.data;
      
      // IMPORTANTE: Usar el contenido de la plantilla (con variables) en lugar del contenido renderizado
      // Esto permite que ContractPreview renderice los bloques dinámicamente con los datos actuales
      setTemplateContent(template.content);

      // Cargar datos de la promesa para que ContractPreview pueda renderizar los bloques
      const dataResult = await getPromiseContractData(
        studioSlug,
        promiseId,
        cotizacionId,
        condicionesComerciales || undefined
      );

      if (!dataResult.success || !dataResult.data) {
        toast.error('Error al cargar datos de la promesa');
        return;
      }

      setEventData(dataResult.data);
      
      // NO renderizar aquí - dejar que ContractPreview lo haga dinámicamente
      // Esto asegura que los bloques @cotizacion_autorizada y @condiciones_comerciales
      // se rendericen correctamente con los datos actuales
    } catch (error) {
      console.error('[loadContractFromTemplate] Error:', error);
      toast.error('Error al cargar el contrato');
    } finally {
      setLoadingContract(false);
      setLoadingData(false);
    }
  }, [studioSlug, promiseId, cotizacionId, contractTemplateId, condicionesComerciales]);

  // Cargar contrato y datos
  // IMPORTANTE: Si hay condiciones comerciales, usar template.content para permitir re-renderizado
  // con el desglose completo. Si no hay condiciones comerciales o es contrato firmado, usar customContent.
  const shouldUseTemplate = condicionesComerciales && !isSigned && contractTemplateId;
  
  useEffect(() => {
    if (isOpen) {
      if (shouldUseTemplate && contractTemplateId) {
        // PRIORIDAD 1: Si hay condiciones comerciales, usar template original para re-renderizar con desglose
        loadContractFromTemplate();
      } else if (contractContent) {
        // PRIORIDAD 2: Si hay contenido personalizado, usarlo directamente
        setRenderedContent(contractContent);
        setTemplateContent(null);
        // Cargar datos en segundo plano para variables básicas
        loadPromiseData();
      } else if (contractTemplateId) {
        // PRIORIDAD 3: Si NO hay contenido personalizado pero sí hay template_id,
        // cargar plantilla por defecto y datos para renderizar dinámicamente
        loadContractFromTemplate();
      }
    } else {
      // Resetear estados al cerrar
      setRenderedContent(null);
      setTemplateContent(null);
      setEventData(null);
      setLoadingContract(false);
      setLoadingData(false);
    }
  }, [isOpen, contractContent, contractTemplateId, shouldUseTemplate, loadPromiseData, loadContractFromTemplate]);

  // Preparar datos del evento para el preview (fallback si no se cargan desde el servidor)
  const eventDataFallback: EventContractData = {
    nombre_cliente: promise.contact_name,
    email_cliente: promise.contact_email || undefined,
    telefono_cliente: promise.contact_phone || undefined,
    direccion_cliente: promise.event_location || undefined,
    nombre_evento: promise.event_name || promise.event_type_name || 'Evento',
    tipo_evento: promise.event_type_name || 'Evento',
    fecha_evento: promise.event_date
      ? formatDisplayDateLong(toUtcDateOnly(promise.event_date))
      : 'Fecha por definir',
    total_contrato: formatMoney(totalAPagar),
    condiciones_pago: condicionesComerciales?.description || 'Por definir',
    nombre_studio: studio.studio_name,
    nombre_representante: studio.representative_name || undefined,
    telefono_studio: studio.phone || undefined,
    correo_studio: studio.email || undefined,
    direccion_studio: studio.address || undefined,
    servicios_incluidos: [], // Se renderiza desde el contenido del contrato
  };

  // Condiciones comerciales: valores del engine (SSoT), metadata de condiciones para el bloque
  const condicionesData: CondicionesComercialesData | undefined = condicionesComerciales
    ? {
        nombre: condicionesComerciales.name,
        descripcion: condicionesComerciales.description || undefined,
        porcentaje_descuento: condicionesComerciales.discount_percentage || undefined,
        porcentaje_anticipo: condicionesComerciales.advance_percentage || undefined,
        tipo_anticipo: (condicionesComerciales.advance_type as 'percentage' | 'fixed_amount') || undefined,
        monto_anticipo: anticipo > 0 ? anticipo : undefined,
        total_contrato: totalAPagar + descuentoAplicado > 0 ? totalAPagar + descuentoAplicado : totalAPagar,
        total_final: totalAPagar,
        descuento_aplicado: descuentoAplicado > 0 ? descuentoAplicado : undefined,
      }
    : undefined;

  const handleSign = () => {
    if (isSigned) {
      toast.info('El contrato ya ha sido firmado');
      return;
    }
    window.dispatchEvent(new CustomEvent('close-overlays'));
    setIsSuccess(false);
    setShowSignConfirmModal(true);
  };

  const handleConfirmSign = async () => {
    setIsSigning(true);
    // Modal de confirmación se mantiene abierto durante toda la firma; se cierra solo al éxito en startTransition

    // OPTIMISTIC UPDATE - Actualizar estado ANTES de Server Action
    if (onContractSignedOptimistic) {
      onContractSignedOptimistic();
    }

    try {
      // Obtener IP del cliente
      let clientIp = '0.0.0.0';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        clientIp = ipData.ip || '0.0.0.0';
      } catch (ipError) {
        console.warn('[handleConfirmSign] Error obteniendo IP:', ipError);
        // Continuar con IP por defecto
      }

      // Fecha local del cliente al firmar (YYYY-MM-DD) para guardar el día legal sin desfase por timezone
      const d = new Date();
      const signature_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const result = await signPublicContract(studioSlug, promiseId, cotizacionId, {
        ip_address: clientIp,
        signature_date,
      });

      if (result.success) {
        setIsSuccess(true);
        toast.success('Contrato firmado exitosamente');
        window.dispatchEvent(new CustomEvent('close-overlays'));
        startTransition(() => {
          setShowSignConfirmModal(false);
          onClose();
          if (onContractSigned) {
            onContractSigned();
          }
        });
      } else {
        console.error('[handleConfirmSign] Error en firma:', result.error);
        toast.error(result.error || 'Error al firmar contrato');
        if (onContractSignedRollback) {
          onContractSignedRollback();
        }
        setIsSigning(false);
      }
    } catch (error) {
      console.error('[handleConfirmSign] Error signing contract:', error);
      toast.error('Error al firmar contrato');
      if (onContractSignedRollback) {
        onContractSignedRollback();
      }
      setIsSigning(false);
    }
  };

  const isPreviewMounted = !!(
    (templateContent || renderedContent) &&
    !((loadingContract || loadingData) && (!templateContent || !eventData))
  );

  const handleExportPDF = async () => {
    if (!printableRef.current) {
      toast.error('No hay datos del contrato disponibles');
      return;
    }

    setIsExportingPDF(true);
    try {
      const filename = `Contrato-${promise.contact_name}-${new Date().toISOString().split('T')[0]}.pdf`;

      await generatePDFFromElement(printableRef.current, {
        filename,
        margin: 0.75,
      });

      toast.success('Contrato exportado a PDF correctamente');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error al exportar PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={() => !isSigning && onClose()}
        title="Contrato de Prestación de Servicios"
        description={
          isSigned 
            ? 'Contrato firmado' 
            : contractVersion 
              ? `Revisa y firma tu contrato (Versión ${contractVersion})`
              : 'Revisa y firma tu contrato'
        }
        maxWidth="4xl"
        zIndex={10070}
        fullScreen={isMobile}
      >
        <div className="space-y-4 relative">
          {/* Contrato estático y legible; skeleton solo mientras cargan datos */}
          {((loadingContract || loadingData) && (!templateContent || !eventData)) ? (
            <div className="bg-zinc-950 rounded-lg max-h-[60vh] overflow-y-auto p-4 md:p-6">
              <div className="space-y-6 animate-pulse">
                {/* Skeleton para título */}
                <div className="space-y-2">
                  <div className="h-8 bg-zinc-800 rounded w-3/4" />
                  <div className="h-4 bg-zinc-800/50 rounded w-1/2" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-zinc-800 rounded w-full" />
                  <div className="h-4 bg-zinc-800 rounded w-5/6" />
                  <div className="h-4 bg-zinc-800 rounded w-4/6" />
                  <div className="h-4 bg-zinc-800 rounded w-full" />
                </div>
                <div className="space-y-3 pt-4">
                  <div className="h-6 bg-zinc-800 rounded w-2/5" />
                  <div className="space-y-2 pl-4">
                    <div className="h-4 bg-zinc-800/70 rounded w-full" />
                    <div className="h-4 bg-zinc-800/70 rounded w-4/5" />
                    <div className="h-4 bg-zinc-800/70 rounded w-3/5" />
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-5 bg-zinc-800 rounded w-1/3" />
                  <div className="space-y-2 pl-6">
                    <div className="h-4 bg-zinc-800/70 rounded w-full" />
                    <div className="h-4 bg-zinc-800/70 rounded w-5/6" />
                    <div className="h-4 bg-zinc-800/70 rounded w-4/6" />
                  </div>
                </div>
                <div className="space-y-2 pt-4">
                  <div className="h-6 bg-zinc-800 rounded w-2/5" />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 bg-zinc-800/70 rounded w-1/3" />
                      <div className="h-4 bg-zinc-800/70 rounded w-1/4" />
                    </div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-zinc-800/70 rounded w-1/4" />
                      <div className="h-4 bg-zinc-800/70 rounded w-1/5" />
                    </div>
                    <div className="flex justify-between pt-2 border-t border-zinc-800">
                      <div className="h-5 bg-zinc-800 rounded w-1/4" />
                      <div className="h-5 bg-zinc-800 rounded w-1/5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (templateContent || renderedContent) ? (
            <div className="bg-zinc-950 rounded-lg max-h-[60vh] overflow-y-auto p-4 md:p-6">
              <ContractPreview
                // ⚠️ HIGIENE DE DATOS: Si hay condiciones comerciales, usar template original para re-renderizar con desglose
                // Si no hay condiciones comerciales, usar contenido renderizado
                content={shouldUseTemplate && templateContent ? templateContent : (renderedContent || '')}
                eventData={eventData || eventDataFallback}
                cotizacionData={eventData?.cotizacionData}
                // ⚠️ HIGIENE DE DATOS: Priorizar condicionesData local (siempre actualizado) sobre eventData?.condicionesData
                condicionesData={condicionesData || eventData?.condicionesData}
                showVariables={false}
                noCard={true}
              />
            </div>
          ) : (
            <div className="bg-zinc-950 rounded-lg py-8 text-center text-zinc-400">
              No se pudo cargar el contrato
            </div>
          )}

          {/* Acciones: habilitar solo cuando el preview del contrato está montado */}
          <div className="flex flex-row gap-2 pt-4 border-t border-zinc-800">
            <ZenButton
              variant="ghost"
              onClick={handleExportPDF}
              disabled={!isPreviewMounted || isExportingPDF || isSigned}
              className="flex-1 text-sm py-2"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>Exportar PDF</>
              )}
            </ZenButton>
            {!isSigned && (
              <ZenButton
                variant="primary"
                onClick={handleSign}
                disabled={!isPreviewMounted || isSigning}
                className="flex-1 text-sm py-2"
              >
                {isSigning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Firmando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Firmar Contrato
                  </>
                )}
              </ZenButton>
            )}
            {isSigned && (
              <div className="flex-1 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2.5">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Firmado</span>
              </div>
            )}
          </div>
          {contractVersion && (
            <div className="pt-2 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 text-center">
                Versión {contractVersion} del contrato
              </p>
            </div>
          )}
        </div>
      </ZenDialog>

      {/* Modal de confirmación: isSuccess/isSigning muestran estado; cierre bloqueado hasta que se cierren tras éxito */}
      <ZenDialog
        isOpen={showSignConfirmModal}
        onClose={() => !isSigning && !isSuccess && setShowSignConfirmModal(false)}
        title={
          isSuccess
            ? '¡Contrato firmado con éxito!'
            : isSigning
              ? 'Procesando tu firma...'
              : '¿Confirmar firma del contrato?'
        }
        description={
          isSuccess
            ? 'Redirigiendo al resumen.'
            : isSigning
              ? 'Un momento mientras registramos tu firma.'
              : 'Al firmar este contrato, confirmas que estás de acuerdo con todas las condiciones establecidas.'
        }
        maxWidth="md"
        zIndex={10080}
      >
        <div className="space-y-4">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center gap-4 py-6" aria-live="polite">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 shrink-0" />
              <p className="text-sm font-medium text-zinc-200">¡Contrato firmado con éxito!</p>
            </div>
          ) : isSigning ? (
            <div className="flex flex-col items-center justify-center gap-4 py-6" aria-live="polite" aria-busy="true">
              <Loader2 className="h-10 w-10 animate-spin text-zinc-300 shrink-0" />
              <p className="text-sm font-medium text-zinc-200">Procesando tu firma...</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-300">
                Esta acción es irreversible. Asegúrate de haber leído y entendido todos los términos del contrato.
              </p>
              <div className="flex gap-2">
                <ZenButton
                  variant="ghost"
                  onClick={() => setShowSignConfirmModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </ZenButton>
                <ZenButton
                  variant="primary"
                  onClick={handleConfirmSign}
                  className="flex-1"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                  Confirmar Firma
                </ZenButton>
              </div>
            </>
          )}
        </div>
      </ZenDialog>

      {/* Hidden Printable Version para PDF */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div
          ref={printableRef}
          style={{
            backgroundColor: '#ffffff',
            color: '#000000',
            padding: '32px',
            width: '210mm',
            minHeight: '297mm',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            lineHeight: '1.6',
          }}
        >
          {(templateContent || renderedContent) && (
            <ContractPreview
              // ⚠️ HIGIENE DE DATOS: Si hay condiciones comerciales, usar template original para re-renderizar con desglose
              // Si no hay condiciones comerciales, usar contenido renderizado
              content={shouldUseTemplate && templateContent ? templateContent : (renderedContent || '')}
              eventData={eventData || eventDataFallback}
              cotizacionData={eventData?.cotizacionData}
              // ⚠️ HIGIENE DE DATOS: Priorizar condicionesData local (siempre actualizado) sobre eventData?.condicionesData
              condicionesData={condicionesData || eventData?.condicionesData}
              noCard={true}
              showVariables={false}
            />
          )}
        </div>
      </div>
    </>
  );
}

