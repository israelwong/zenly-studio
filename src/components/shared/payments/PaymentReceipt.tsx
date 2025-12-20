'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, DollarSign, FileText, Download, Calendar, X } from 'lucide-react';
import { ZenDialog, ZenButton, ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { obtenerDatosComprobante, type ReceiptData } from '@/lib/actions/studio/business/events/payments-receipt.actions';
import { formatDate, formatDateTime, formatNumber } from '@/lib/actions/utils/formatting';
import { toast } from 'sonner';


interface PaymentReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  paymentId: string;
}

// Helper para formatear montos
const formatAmount = (amount: number): string => {
  return `$${formatNumber(amount, 2)}`;
};

export function PaymentReceipt({
  isOpen,
  onClose,
  studioSlug,
  paymentId,
}: PaymentReceiptProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReceiptData | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  // const [sendingEmail, setSendingEmail] = useState(false); // TODO: Implementar envío de correos
  const printableRef = useRef<HTMLDivElement>(null);
  const previousPaymentIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Solo cargar si el modal está abierto y el paymentId cambió
    if (isOpen && paymentId && paymentId !== previousPaymentIdRef.current) {
      previousPaymentIdRef.current = paymentId;
      setLoading(true);
      setData(null);

      const loadReceiptData = async () => {
        try {
          const result = await obtenerDatosComprobante(studioSlug, paymentId);
          if (result.success && result.data) {
            console.log('Receipt data loaded:', result.data);
            setData(result.data);
          } else {
            toast.error(result.error || 'Error al cargar datos del comprobante');
            onClose();
          }
        } catch (error) {
          console.error('Error loading receipt data:', error);
          toast.error('Error al cargar datos del comprobante');
          onClose();
        } finally {
          setLoading(false);
        }
      };
      loadReceiptData();
    } else if (!isOpen) {
      // Resetear solo cuando el modal se cierra completamente
      previousPaymentIdRef.current = null;
      setData(null);
      setLoading(false);
    }
  }, [isOpen, paymentId, studioSlug]);

  const handleDownloadPDF = async () => {
    if (!data || !printableRef.current) return;

    setGeneratingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      // Clone and strip all classes/attributes that reference Tailwind
      const clone = printableRef.current.cloneNode(true) as HTMLElement;
      const allElements = clone.querySelectorAll('*');

      allElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.removeAttribute('class');
        htmlEl.removeAttribute('data-tailwind');
      });

      // Create iframe to isolate from page styles
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '210mm';
      iframe.style.height = '297mm';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      // Write minimal HTML without any stylesheets
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="margin: 0; padding: 32px; width: 210mm; min-height: 297mm; background: white;">
          ${clone.innerHTML}
        </body>
        </html>
      `);
      iframeDoc.close();

      // Wait for iframe to render
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
      pdf.save(`comprobante-${data.payment.id.slice(0, 8)}.pdf`);

      toast.success('PDF generado correctamente');
      document.body.removeChild(iframe);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // TODO: Implementar envío de correos
  // const handleSendEmail = async () => {
  //   if (!data?.contact?.email) {
  //     toast.error('El cliente no tiene correo electrónico registrado');
  //     return;
  //   }
  //
  //   setSendingEmail(true);
  //   try {
  //     toast.info('Enviando comprobante por correo...');
  //     console.log('Enviar comprobante para pago:', paymentId, 'a:', data.contact.email);
  //     // Implementar llamada a server action para enviar correo
  //     await new Promise(resolve => setTimeout(resolve, 1500));
  //     toast.success('Comprobante enviado correctamente');
  //   } catch (error) {
  //     console.error('Error sending email:', error);
  //     toast.error('Error al enviar comprobante');
  //   } finally {
  //     setSendingEmail(false);
  //   }
  // };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={onClose}
        title="Comprobante de Pago"
        description="Detalles del comprobante de pago"
        maxWidth="2xl"
        onCancel={onClose}
        cancelLabel="Cerrar ventana"
        onSave={handleDownloadPDF}
        saveLabel="Descargar PDF"
        saveVariant="primary"
        isLoading={generatingPdf}
      >
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto pr-2 -mr-2">
          {loading && (
            <div className="space-y-6">
              {/* Skeleton para Datos del Cliente y Evento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-32 bg-zinc-800 animate-pulse" />
                  <Skeleton className="h-4 w-full bg-zinc-800 animate-pulse" />
                  <Skeleton className="h-4 w-3/4 bg-zinc-800 animate-pulse" />
                  <Skeleton className="h-4 w-2/3 bg-zinc-800 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-6 w-32 bg-zinc-800 animate-pulse" />
                  <Skeleton className="h-4 w-full bg-zinc-800 animate-pulse" />
                  <Skeleton className="h-4 w-3/4 bg-zinc-800 animate-pulse" />
                  <Skeleton className="h-4 w-2/3 bg-zinc-800 animate-pulse" />
                </div>
              </div>

              {/* Skeleton para Detalles del Pago */}
              <div className="space-y-3">
                <Skeleton className="h-6 w-32 bg-zinc-800 animate-pulse" />
                <Skeleton className="h-4 w-full bg-zinc-800 animate-pulse" />
                <Skeleton className="h-4 w-3/4 bg-zinc-800 animate-pulse" />
                <Skeleton className="h-4 w-2/3 bg-zinc-800 animate-pulse" />
              </div>

              {/* Skeleton para Balance */}
              <div className="space-y-3">
                <Skeleton className="h-6 w-32 bg-zinc-800 animate-pulse" />
                <Skeleton className="h-4 w-full bg-zinc-800 animate-pulse" />
                <Skeleton className="h-4 w-3/4 bg-zinc-800 animate-pulse" />
                <Skeleton className="h-4 w-2/3 bg-zinc-800 animate-pulse" />
              </div>

              {/* Skeleton para Botones */}
              <div className="flex gap-3 pt-2">
                <Skeleton className="h-10 flex-1 bg-zinc-800 animate-pulse" />
              </div>
            </div>
          )}
          {!loading && data && (
            <div className="space-y-6">
              {/* Datos del Negocio - Solo en PDF, oculto en previsualización */}

              {/* Datos del Cliente y Detalles del Evento - 2 Columnas */}
              <div className="grid grid-cols-2 gap-4">
                {/* Datos del Cliente */}
                {data.contact && (
                  <ZenCard variant="outlined">
                    <ZenCardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="h-4 w-4 text-blue-400" />
                        <h3 className="text-sm font-semibold text-zinc-200">Datos del Cliente</h3>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-zinc-100">{data.contact.name}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                          {data.contact.phone && <span>{data.contact.phone}</span>}
                          {data.contact.email && <span>{data.contact.email}</span>}
                        </div>
                        {data.contact.address && (
                          <p className="text-xs text-zinc-400 mt-2">{data.contact.address}</p>
                        )}
                      </div>
                    </ZenCardContent>
                  </ZenCard>
                )}

                {/* Detalles del Evento */}
                {data.event && (
                  <ZenCard variant="outlined">
                    <ZenCardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4 text-purple-400" />
                        <h3 className="text-sm font-semibold text-zinc-200">Detalles del Evento</h3>
                      </div>
                      <div className="space-y-3">
                        {data.event.name && (
                          <div>
                            <p className="text-xs text-zinc-400 mb-1">Nombre del Evento</p>
                            <p className="text-sm font-medium text-zinc-100">{data.event.name}</p>
                          </div>
                        )}
                        {data.event.event_type_name && (
                          <div>
                            <p className="text-xs text-zinc-400 mb-1">Tipo de Evento</p>
                            <p className="text-sm font-medium text-zinc-100">{data.event.event_type_name}</p>
                          </div>
                        )}
                        {data.event.event_location && (
                          <div>
                            <p className="text-xs text-zinc-400 mb-1">Locación / Sede</p>
                            <p className="text-sm font-medium text-zinc-100">{data.event.event_location}</p>
                          </div>
                        )}
                        {data.event.address && (
                          <div>
                            <p className="text-xs text-zinc-400 mb-1">Dirección</p>
                            <p className="text-sm font-medium text-zinc-100">{data.event.address}</p>
                          </div>
                        )}
                        {data.event.event_date && (
                          <div>
                            <p className="text-xs text-zinc-400 mb-1">Fecha del Evento</p>
                            <p className="text-sm font-medium text-zinc-100">{formatDate(data.event.event_date)}</p>
                          </div>
                        )}
                      </div>
                    </ZenCardContent>
                  </ZenCard>
                )}
              </div>


              {/* Datos del Pago */}
              <ZenCard variant="outlined">
                <ZenCardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-zinc-200">Detalles del Pago</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Monto</span>
                      <span className="text-sm font-semibold text-emerald-200">
                        {formatAmount(data.payment.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Método de pago</span>
                      <span className="text-xs font-medium text-zinc-200 capitalize">
                        {data.payment.payment_method}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Fecha</span>
                      <span className="text-xs font-medium text-zinc-200">
                        {formatDate(data.payment.payment_date)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-xs text-zinc-400">Concepto</span>
                      <span className="text-xs font-medium text-zinc-200 text-right max-w-[60%]">
                        {data.payment.concept}
                      </span>
                    </div>
                    {data.payment.description && (
                      <div className="pt-2 border-t border-zinc-700/30">
                        <p className="text-xs text-zinc-400 mb-1">Descripción</p>
                        <p className="text-xs text-zinc-300">{data.payment.description}</p>
                      </div>
                    )}
                  </div>
                </ZenCardContent>
              </ZenCard>

              {/* Balance */}
              <ZenCard variant="outlined">
                <ZenCardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-zinc-200">Balance</h3>
                  </div>
                  <div className="space-y-2">
                    {data.balance.price !== undefined && data.balance.discount && data.balance.discount > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400">Precio Base</span>
                          <span className="text-xs font-medium text-zinc-300">
                            {formatAmount(data.balance.price)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400">Descuento</span>
                          <span className="text-xs font-medium text-red-400">
                            -{formatAmount(data.balance.discount)}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-700/30">
                      <span className="text-xs text-zinc-400">Total a Pagar</span>
                      <span className="text-sm font-semibold text-zinc-200">
                        {formatAmount(data.balance.total)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Pagado</span>
                      <span className="text-sm font-semibold text-green-400">
                        {formatAmount(data.balance.paid)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-700/30">
                      <span className="text-xs font-medium text-zinc-300">Pendiente</span>
                      <span className="text-sm font-semibold text-red-400">
                        {formatAmount(data.balance.pending)}
                      </span>
                    </div>
                  </div>
                </ZenCardContent>
              </ZenCard>

              {/* Historial de Pagos */}
              {data.paymentHistory && data.paymentHistory.length > 0 && (
                <ZenCard variant="outlined">
                  <ZenCardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-zinc-200">Historial de Pagos</h3>
                    </div>
                    <div className="space-y-2">
                      {data.paymentHistory.map((pago, index) => (
                        <div
                          key={pago.id}
                          className={`flex items-center justify-between py-2 ${index < data.paymentHistory!.length - 1 ? 'border-b border-zinc-700/30' : ''
                            }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-zinc-200 truncate">
                              {pago.concept}
                            </p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-xs text-zinc-500">
                                {formatDateTime(pago.payment_date)}
                              </span>
                              <span className="text-xs text-zinc-500 capitalize">
                                {pago.payment_method}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-emerald-400 ml-4">
                            {formatAmount(pago.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ZenCardContent>
                </ZenCard>
              )}
            </div>
          )}
          {!loading && !data && (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-400">No se pudieron cargar los datos del comprobante</p>
            </div>
          )}
        </div>
      </ZenDialog>

      {/* Hidden Printable Version - NO Tailwind classes (html2canvas incompatible with oklch) */}
      {data && (
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
              lineHeight: '1.6'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '32px',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {data.studio.logo_url && (
                  <img
                    src={data.studio.logo_url}
                    alt={data.studio.studio_name}
                    style={{
                      height: '64px',
                      width: '64px',
                      objectFit: 'contain'
                    }}
                  />
                )}
                <div>
                  <h1 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#111827',
                    margin: '0 0 12px 0'
                  }}>{data.studio.studio_name}</h1>
                  <p style={{
                    fontSize: '14px',
                    color: '#4b5563',
                    margin: 0
                  }}>{data.studio.address}</p>
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '4px',
                    fontSize: '14px',
                    color: '#4b5563'
                  }}>
                    {data.studio.email && <span>{data.studio.email}</span>}
                    {data.studio.phone && <span>• {data.studio.phone}</span>}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  margin: '0 0 12px 0'
                }}>COMPROBANTE DE PAGO</h2>
                <p style={{
                  fontSize: '14px',
                  color: '#4b5563',
                  margin: '0 0 4px 0'
                }}>Fecha: {formatDate(data.payment.payment_date)}</p>
                <p style={{
                  fontSize: '14px',
                  color: '#4b5563',
                  margin: 0
                }}>ID: {data.payment.id.slice(0, 8)}</p>
              </div>
            </div>

            {/* Client Info */}
            {data.contact && (
              <div style={{ marginBottom: '36px', pageBreakInside: 'avoid' }}>
                <h3 style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '12px',
                  marginTop: 0,
                  marginLeft: 0,
                  marginRight: 0
                }}>Cliente</h3>
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #f3f4f6'
                }}>
                  <p style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    margin: '0 0 10px 0'
                  }}>{data.contact.name}</p>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '14px',
                    color: '#4b5563'
                  }}>
                    {data.contact.email && <span>{data.contact.email}</span>}
                    {data.contact.phone && <span>{data.contact.phone}</span>}
                  </div>
                  {data.contact.address && (
                    <p style={{
                      fontSize: '14px',
                      color: '#4b5563',
                      marginTop: '10px',
                      margin: 0
                    }}>{data.contact.address}</p>
                  )}
                </div>
              </div>
            )}

            {/* Event/Promise Info */}
            {data.event && (
              <div style={{ marginBottom: '36px', pageBreakInside: 'avoid' }}>
                <h3 style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '12px',
                  marginTop: 0,
                  marginLeft: 0,
                  marginRight: 0
                }}>Detalles del Evento</h3>
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #f3f4f6'
                }}>
                  {data.event.name && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Nombre del Evento</p>
                      <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>{data.event.name}</p>
                    </div>
                  )}
                  {data.event.event_type_name && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Tipo de Evento</p>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: 0 }}>{data.event.event_type_name}</p>
                    </div>
                  )}
                  {data.event.event_location && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Locación / Sede</p>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: 0 }}>{data.event.event_location}</p>
                    </div>
                  )}
                  {data.event.address && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Dirección</p>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: 0 }}>{data.event.address}</p>
                    </div>
                  )}
                  {data.event.event_date && (
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Fecha del Evento</p>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: 0 }}>{formatDate(data.event.event_date)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Details */}
            <div style={{ marginBottom: '36px', pageBreakInside: 'avoid' }}>
              <h3 style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px',
                marginTop: 0,
                marginLeft: 0,
                marginRight: 0
              }}>Detalles del Pago</h3>
              <table style={{
                width: '100%',
                textAlign: 'left',
                borderCollapse: 'collapse',
                tableLayout: 'fixed'
              }}>
                <colgroup>
                  <col style={{ width: '45%' }} />
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{
                      padding: '12px 8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      textAlign: 'left',
                      verticalAlign: 'bottom'
                    }}>Concepto</th>
                    <th style={{
                      padding: '12px 8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      textAlign: 'left',
                      verticalAlign: 'bottom'
                    }}>Método</th>
                    <th style={{
                      padding: '12px 8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      textAlign: 'right',
                      verticalAlign: 'bottom'
                    }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{
                      padding: '16px 8px',
                      color: '#1f2937',
                      wordBreak: 'break-word'
                    }}>
                      <div style={{ fontWeight: '500', marginBottom: '4px' }}>{data.payment.concept}</div>
                      {data.payment.description && (
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          wordBreak: 'break-word'
                        }}>{data.payment.description}</div>
                      )}
                    </td>
                    <td style={{
                      padding: '16px 8px',
                      color: '#1f2937',
                      textTransform: 'capitalize',
                      wordBreak: 'break-word'
                    }}>{data.payment.payment_method}</td>
                    <td style={{
                      padding: '16px 8px',
                      color: '#111827',
                      fontWeight: 'bold',
                      textAlign: 'right',
                      fontSize: '18px',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatAmount(data.payment.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Balance Summary */}
            <div style={{
              marginTop: '48px',
              marginBottom: '48px',
              pageBreakInside: 'avoid'
            }}>
              <div style={{ maxWidth: '55%', marginLeft: 'auto' }}>
                <h3 style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '16px',
                  textAlign: 'right',
                  marginTop: 0,
                  marginLeft: 0,
                  marginRight: 0
                }}>Resumen de Cuenta</h3>
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #f3f4f6'
                }}>
                  {data.balance.price !== undefined && data.balance.discount && data.balance.discount > 0 && (
                    <>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '14px',
                        marginBottom: '8px',
                        gap: '16px'
                      }}>
                        <span style={{ color: '#6b7280', margin: 0 }}>Precio Base:</span>
                        <span style={{ fontWeight: '500', color: '#4b5563', margin: 0, textAlign: 'right' }}>{formatAmount(data.balance.price)}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '14px',
                        marginBottom: '12px',
                        gap: '16px'
                      }}>
                        <span style={{ color: '#6b7280', margin: 0 }}>Descuento:</span>
                        <span style={{ fontWeight: '500', color: '#dc2626', margin: 0, textAlign: 'right' }}>-{formatAmount(data.balance.discount)}</span>
                      </div>
                    </>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    marginBottom: '12px',
                    gap: '16px',
                    borderTop: data.balance.price !== undefined && data.balance.discount && data.balance.discount > 0 ? '1px solid #e5e7eb' : 'none',
                    paddingTop: data.balance.price !== undefined && data.balance.discount && data.balance.discount > 0 ? '12px' : '0'
                  }}>
                    <span style={{ color: '#4b5563', margin: 0 }}>Total a Pagar:</span>
                    <span style={{ fontWeight: '600', color: '#111827', margin: 0, textAlign: 'right' }}>{formatAmount(data.balance.total)}</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    marginBottom: '12px',
                    gap: '16px'
                  }}>
                    <span style={{ color: '#4b5563', margin: 0 }}>Total Pagado:</span>
                    <span style={{ fontWeight: '600', color: '#16a34a', margin: 0, textAlign: 'right' }}>{formatAmount(data.balance.paid)}</span>
                  </div>
                  <div style={{
                    borderTop: '1px solid #e5e7eb',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '16px',
                    gap: '16px'
                  }}>
                    <span style={{ fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Pendiente:</span>
                    <span style={{
                      fontWeight: 'bold',
                      color: data.balance.pending > 0 ? '#dc2626' : '#111827',
                      margin: 0,
                      textAlign: 'right'
                    }}>
                      {formatAmount(data.balance.pending)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {data.paymentHistory && data.paymentHistory.length > 0 && (
              <div style={{
                marginTop: '48px',
                marginBottom: '48px',
                pageBreakInside: 'avoid'
              }}>
                <h3 style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '16px',
                  marginTop: 0,
                  marginLeft: 0,
                  marginRight: 0
                }}>Historial de Pagos</h3>
                <table style={{
                  width: '100%',
                  textAlign: 'left',
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed'
                }}>
                  <colgroup>
                    <col style={{ width: '40%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '15%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{
                        padding: '12px 8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#374151',
                        textAlign: 'left',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Concepto</th>
                      <th style={{
                        padding: '12px 8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#374151',
                        textAlign: 'left',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Fecha</th>
                      <th style={{
                        padding: '12px 8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#374151',
                        textAlign: 'left',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Método</th>
                      <th style={{
                        padding: '12px 8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#374151',
                        textAlign: 'right',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.paymentHistory.map((pago, index) => (
                      <tr key={pago.id} style={{
                        borderBottom: index < data.paymentHistory!.length - 1 ? '1px solid #f3f4f6' : 'none'
                      }}>
                        <td style={{
                          padding: '12px 8px',
                          color: '#1f2937',
                          wordBreak: 'break-word',
                          fontSize: '14px'
                        }}>
                          <div style={{ fontWeight: '500' }}>{pago.concept}</div>
                          {pago.description && (
                            <div style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              marginTop: '4px'
                            }}>{pago.description}</div>
                          )}
                        </td>
                        <td style={{
                          padding: '12px 8px',
                          color: '#4b5563',
                          fontSize: '13px'
                        }}>{formatDateTime(pago.payment_date)}</td>
                        <td style={{
                          padding: '12px 8px',
                          color: '#4b5563',
                          textTransform: 'capitalize',
                          fontSize: '13px'
                        }}>{pago.payment_method}</td>
                        <td style={{
                          padding: '12px 8px',
                          color: '#111827',
                          fontWeight: '600',
                          textAlign: 'right',
                          fontSize: '14px',
                          whiteSpace: 'nowrap'
                        }}>
                          {formatAmount(pago.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <div style={{
              marginTop: '60px',
              paddingTop: '20px',
              borderTop: '1px solid #e5e7eb',
              textAlign: 'center',
              fontSize: '14px',
              color: '#6b7280',
              pageBreakInside: 'avoid'
            }}>
              <p style={{ margin: '0 0 8px 0' }}>Gracias por su preferencia.</p>
              <p style={{ fontSize: '12px', margin: 0 }}>Este documento es un comprobante de pago generado automáticamente.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

