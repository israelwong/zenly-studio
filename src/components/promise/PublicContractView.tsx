'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, CheckCircle2, Edit2, Download, Loader2 } from 'lucide-react';
import { ZenDialog, ZenButton, ZenBadge } from '@/components/ui/zen';
import { ContractPreview } from '@/components/shared/contracts/ContractPreview';
import type { EventContractData } from '@/types/contracts';
import type { CondicionesComercialesData } from '@/app/[slug]/studio/config/contratos/components/types';
import { signPublicContract } from '@/lib/actions/public/contracts.actions';
import { toast } from 'sonner';
import { generatePDFFromElement } from '@/lib/utils/pdf-generator';

interface PublicContractViewProps {
  isOpen: boolean;
  onClose: () => void;
  onContractSigned?: () => void;
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
  cotizacionPrice: number;
  isSigned: boolean;
  eventTypeId?: string | null;
}

export function PublicContractView({
  isOpen,
  onClose,
  onContractSigned,
  cotizacionId,
  promiseId,
  studioSlug,
  contractContent,
  contractTemplateId,
  contractVersion,
  condicionesComerciales,
  promise,
  studio,
  cotizacionPrice,
  isSigned,
  eventTypeId,
}: PublicContractViewProps) {
  const [isSigning, setIsSigning] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showSignConfirmModal, setShowSignConfirmModal] = useState(false);
  const [loadingContract, setLoadingContract] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [renderedContent, setRenderedContent] = useState<string | null>(contractContent);
  const [eventData, setEventData] = useState<any>(null);
  const printableRef = useRef<HTMLDivElement>(null);

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
  // IMPORTANTE: Priorizar contractContent personalizado sobre la plantilla por defecto
  // Si hay contractContent personalizado, usarlo directamente
  // Solo si NO hay contractContent pero sí hay contractTemplateId, cargar la plantilla por defecto
  useEffect(() => {
    if (isOpen) {
      if (contractContent) {
        // PRIORIDAD 1: Si hay contenido personalizado, usarlo directamente
        // Esto asegura que se muestre la versión personalizada del contrato
        setRenderedContent(contractContent);
        setTemplateContent(null); // Limpiar template content para evitar conflictos
        // Cargar datos en segundo plano, pero mostrar contenido inmediatamente
        loadPromiseData();
      } else if (contractTemplateId) {
        // PRIORIDAD 2: Si NO hay contenido personalizado pero sí hay template_id,
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
  }, [isOpen, contractContent, contractTemplateId, loadPromiseData, loadContractFromTemplate]);

  // Calcular total con descuentos y condiciones comerciales
  const calcularTotal = () => {
    let total = cotizacionPrice;
    
    // Aplicar descuento de condiciones comerciales si existe
    if (condicionesComerciales?.discount_percentage) {
      const descuento = (total * condicionesComerciales.discount_percentage) / 100;
      total = total - descuento;
    }
    
    return total;
  };

  const totalContrato = calcularTotal();

  // Preparar datos del evento para el preview (fallback si no se cargan desde el servidor)
  const eventDataFallback: EventContractData = {
    nombre_cliente: promise.contact_name,
    email_cliente: promise.contact_email || undefined,
    telefono_cliente: promise.contact_phone || undefined,
    direccion_cliente: promise.event_location || undefined,
    nombre_evento: promise.event_name || promise.event_type_name || 'Evento',
    tipo_evento: promise.event_type_name || 'Evento',
    fecha_evento: promise.event_date
      ? new Date(promise.event_date).toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Fecha por definir',
    total_contrato: `$${totalContrato.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`,
    condiciones_pago: condicionesComerciales?.description || 'Por definir',
    nombre_studio: studio.studio_name,
    nombre_representante: studio.representative_name || undefined,
    telefono_studio: studio.phone || undefined,
    correo_studio: studio.email || undefined,
    direccion_studio: studio.address || undefined,
    servicios_incluidos: [], // Se renderiza desde el contenido del contrato
  };

  // Construir condicionesData con todos los campos necesarios para el desglose
  const condicionesData: CondicionesComercialesData | undefined = condicionesComerciales
    ? (() => {
        // Calcular descuento aplicado
        let descuentoAplicado = 0;
        if (condicionesComerciales.discount_percentage) {
          descuentoAplicado = (cotizacionPrice * condicionesComerciales.discount_percentage) / 100;
        }
        
        const totalFinal = cotizacionPrice - descuentoAplicado;
        
        return {
          nombre: condicionesComerciales.name,
          descripcion: condicionesComerciales.description || undefined,
          porcentaje_descuento: condicionesComerciales.discount_percentage || undefined,
          porcentaje_anticipo: condicionesComerciales.advance_percentage || undefined,
          tipo_anticipo: (condicionesComerciales.advance_type as 'percentage' | 'fixed_amount') || undefined,
          monto_anticipo: condicionesComerciales.advance_amount || undefined,
          total_contrato: cotizacionPrice, // Precio base antes de descuentos
          total_final: totalFinal, // Precio después de descuentos
          descuento_aplicado: descuentoAplicado, // Monto del descuento aplicado
        };
      })()
    : undefined;

  const handleSign = () => {
    if (isSigned) {
      toast.info('El contrato ya ha sido firmado');
      return;
    }
    setShowSignConfirmModal(true);
  };

  const handleConfirmSign = async () => {
    setIsSigning(true);
    setShowSignConfirmModal(false);

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

      const result = await signPublicContract(studioSlug, promiseId, cotizacionId, {
        ip_address: clientIp,
      });

      if (result.success) {
        toast.success('Contrato firmado exitosamente');
        // Cerrar modal y actualizar estado local
        // La firma se guardó en studio_cotizaciones_cierre.contract_signed_at (tabla temporal)
        onClose();
        // Llamar al callback para actualizar el estado en el componente padre
        if (onContractSigned) {
          onContractSigned();
        }
      } else {
        console.error('[handleConfirmSign] Error en firma:', result.error);
        toast.error(result.error || 'Error al firmar contrato');
      }
    } catch (error) {
      console.error('[handleConfirmSign] Error signing contract:', error);
      toast.error('Error al firmar contrato');
    } finally {
      setIsSigning(false);
    }
  };

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
        onClose={onClose}
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
      >
        <div className="space-y-4">
          {/* Contenido del contrato */}
          {/* Mostrar spinner solo si NO hay contenido disponible Y está cargando */}
          {loadingContract && !templateContent && !renderedContent ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : (templateContent || renderedContent) ? (
            <div className="bg-zinc-900 rounded-lg max-h-[60vh] overflow-y-auto p-4 md:p-6">
              <ContractPreview
                content={templateContent || renderedContent || ''}
                eventData={eventData || eventDataFallback}
                cotizacionData={eventData?.cotizacionData}
                condicionesData={eventData?.condicionesData || condicionesData}
                showVariables={false}
                noCard={true}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-400">
              No se pudo cargar el contrato
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-row gap-2 pt-4 border-t border-zinc-800">
            <ZenButton
              variant="ghost"
              onClick={handleExportPDF}
              disabled={isExportingPDF}
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
                disabled={isSigning}
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
                <span className="text-sm font-medium text-emerald-400">Contrato Firmado</span>
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

      {/* Modal de confirmación de firma */}
      <ZenDialog
        isOpen={showSignConfirmModal}
        onClose={() => setShowSignConfirmModal(false)}
        title="¿Confirmar firma del contrato?"
        description="Al firmar este contrato, confirmas que estás de acuerdo con todas las condiciones establecidas."
        maxWidth="md"
        zIndex={10080}
      >
        <div className="space-y-4">
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
              disabled={isSigning}
              className="flex-1"
            >
              {isSigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Firmando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Firma
                </>
              )}
            </ZenButton>
          </div>
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
              content={templateContent || renderedContent || ''}
              eventData={eventData || eventDataFallback}
              cotizacionData={eventData?.cotizacionData}
              condicionesData={eventData?.condicionesData || condicionesData}
              noCard={true}
              showVariables={false}
            />
          )}
        </div>
      </div>
    </>
  );
}

