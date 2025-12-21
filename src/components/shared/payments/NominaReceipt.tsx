'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, DollarSign, FileText, Download, Calendar, List, CreditCard } from 'lucide-react';
import { ZenDialog, ZenButton, ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { obtenerDatosComprobanteNomina, type NominaReceiptData } from '@/lib/actions/studio/business/finanzas/nomina-receipt.actions';
import { formatDate, formatDateTime, formatNumber } from '@/lib/actions/utils/formatting';
import { toast } from 'sonner';

interface NominaReceiptProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    nominaId: string;
}

const formatAmount = (amount: number): string => {
    return `$${formatNumber(amount, 2)}`;
};

export function NominaReceipt({
    isOpen,
    onClose,
    studioSlug,
    nominaId,
}: NominaReceiptProps) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<NominaReceiptData | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const printableRef = useRef<HTMLDivElement>(null);
    const previousNominaIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (isOpen && nominaId && nominaId !== previousNominaIdRef.current) {
            previousNominaIdRef.current = nominaId;
            setLoading(true);
            setData(null);

            const loadReceiptData = async () => {
                try {
                    const result = await obtenerDatosComprobanteNomina(studioSlug, nominaId);
                    if (result.success && result.data) {
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
            previousNominaIdRef.current = null;
            setData(null);
            setLoading(false);
        }
    }, [isOpen, nominaId, studioSlug, onClose]);

    const handleDownloadPDF = async () => {
        if (!data || !printableRef.current) return;

        setGeneratingPdf(true);
        try {
            const { jsPDF } = await import('jspdf');
            const html2canvas = (await import('html2canvas')).default;

            const clone = printableRef.current.cloneNode(true) as HTMLElement;
            const allElements = clone.querySelectorAll('*');

            allElements.forEach(el => {
                const htmlEl = el as HTMLElement;
                htmlEl.removeAttribute('class');
                htmlEl.removeAttribute('data-tailwind');
            });

            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.style.width = '210mm';
            iframe.style.height = '297mm';
            document.body.appendChild(iframe);

            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) throw new Error('Cannot access iframe document');

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
            pdf.save(`comprobante-nomina-${data.nomina.id.slice(0, 8)}.pdf`);

            toast.success('PDF generado correctamente');
            document.body.removeChild(iframe);
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Error al generar PDF');
        } finally {
            setGeneratingPdf(false);
        }
    };

    return (
        <>
            <ZenDialog
                isOpen={isOpen}
                onClose={onClose}
                title="Comprobante de Pago de Nómina"
                description="Detalles del comprobante de pago de nómina"
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
                            {/* Grid de 2 columnas: Personal y Detalles del Pago */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Card Personal */}
                                <ZenCard variant="outlined">
                                    <ZenCardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Skeleton className="h-4 w-4 bg-zinc-800 animate-pulse rounded" />
                                            <Skeleton className="h-4 w-20 bg-zinc-800 animate-pulse" />
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-32 bg-zinc-800 animate-pulse" />
                                            <div className="flex flex-wrap gap-3">
                                                <Skeleton className="h-3 w-24 bg-zinc-800 animate-pulse" />
                                                <Skeleton className="h-3 w-32 bg-zinc-800 animate-pulse" />
                                            </div>
                                        </div>
                                    </ZenCardContent>
                                </ZenCard>

                                {/* Card Detalles del Pago */}
                                <ZenCard variant="outlined">
                                    <ZenCardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Skeleton className="h-4 w-4 bg-zinc-800 animate-pulse rounded" />
                                            <Skeleton className="h-4 w-28 bg-zinc-800 animate-pulse" />
                                        </div>
                                        <div className="space-y-2">
                                            <div>
                                                <Skeleton className="h-3 w-20 mb-1 bg-zinc-800 animate-pulse" />
                                                <Skeleton className="h-4 w-32 bg-zinc-800 animate-pulse" />
                                            </div>
                                        </div>
                                    </ZenCardContent>
                                </ZenCard>
                            </div>

                            {/* Card Concepto y Monto unificado */}
                            <ZenCard variant="outlined">
                                <ZenCardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Skeleton className="h-4 w-4 bg-zinc-800 animate-pulse rounded" />
                                        <Skeleton className="h-4 w-36 bg-zinc-800 animate-pulse" />
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <Skeleton className="h-3 w-20 mb-1 bg-zinc-800 animate-pulse" />
                                            <Skeleton className="h-3 w-full bg-zinc-800 animate-pulse" />
                                        </div>
                                        <div className="pt-4 mt-4 border-t border-l-2 border-zinc-700/30 border-l-emerald-500/50 pl-4">
                                            <Skeleton className="h-3 w-32 mb-3 bg-zinc-800 animate-pulse" />
                                            <div className="space-y-2">
                                                {[1, 2, 3].map((index) => (
                                                    <div
                                                        key={index}
                                                        className={`flex items-center justify-between py-2.5 px-3 rounded-md bg-zinc-900/30 ${index < 3 ? 'mb-2' : ''}`}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <Skeleton className="h-3 w-40 mb-1 bg-zinc-800 animate-pulse" />
                                                            <Skeleton className="h-3 w-24 bg-zinc-800 animate-pulse" />
                                                        </div>
                                                        <div className="text-right ml-4 shrink-0">
                                                            <Skeleton className="h-4 w-16 bg-zinc-800 animate-pulse" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-zinc-700/30">
                                            <Skeleton className="h-3 w-20 bg-zinc-800 animate-pulse" />
                                            <Skeleton className="h-6 w-24 bg-zinc-800 animate-pulse" />
                                        </div>
                                    </div>
                                </ZenCardContent>
                            </ZenCard>
                        </div>
                    )}
                    {!loading && data && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                {data.personal && (
                                    <ZenCard variant="outlined">
                                        <ZenCardContent className="p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <User className="h-4 w-4 text-blue-400" />
                                                <h3 className="text-sm font-semibold text-zinc-200">Personal</h3>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-zinc-100">{data.personal.name}</p>
                                                <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                                                    {data.personal.phone && <span>{data.personal.phone}</span>}
                                                    {data.personal.email && <span>{data.personal.email}</span>}
                                                </div>
                                            </div>
                                        </ZenCardContent>
                                    </ZenCard>
                                )}

                                <ZenCard variant="outlined">
                                    <ZenCardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Calendar className="h-4 w-4 text-purple-400" />
                                            <h3 className="text-sm font-semibold text-zinc-200">Detalles del Pago</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-xs text-zinc-400 mb-1">Fecha de Pago</p>
                                                <p className="text-sm font-medium text-zinc-100">{formatDate(data.nomina.payment_date)}</p>
                                            </div>
                                        </div>
                                    </ZenCardContent>
                                </ZenCard>
                            </div>

                            <ZenCard variant="outlined">
                                <ZenCardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <DollarSign className="h-4 w-4 text-emerald-400" />
                                        <h3 className="text-sm font-semibold text-zinc-200">Resumen del pago</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {data.nomina.description && (
                                            <div>
                                                <p className="text-xs text-zinc-400 mb-1">Concepto</p>
                                                <p className="text-sm text-zinc-300">
                                                    {data.nomina.description.replace(/consolidado/gi, '').trim()}
                                                </p>
                                            </div>
                                        )}

                                        {data.servicios.length > 0 && (
                                            <div className="pt-4 mt-4 border-t border-l-2 border-zinc-700/30 border-l-emerald-500/50 pl-4">
                                                <p className="text-xs font-medium text-zinc-400 mb-3">Conceptos incluidos:</p>
                                                <div className="space-y-2">
                                                    {data.servicios.map((servicio, index) => (
                                                        <div
                                                            key={index}
                                                            className={`flex items-center justify-between py-2.5 px-3 rounded-md bg-zinc-900/30 ${index < data.servicios.length - 1 ? 'mb-2' : ''}`}
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-medium text-zinc-200 truncate">
                                                                    {servicio.service_name}
                                                                    {servicio.assigned_quantity > 1 && ` x${servicio.assigned_quantity}`}
                                                                </p>
                                                                {servicio.category_name && (
                                                                    <p className="text-xs text-zinc-500 mt-0.5">{servicio.category_name}</p>
                                                                )}
                                                            </div>
                                                            <div className="text-right ml-4 shrink-0">
                                                                <p className="text-sm font-semibold text-zinc-200">
                                                                    {formatAmount(servicio.assigned_cost)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {data.totalDiscounts && data.totalDiscounts > 0 && (
                                            <div className="flex items-center justify-between ">
                                                <span className="text-xs text-zinc-400">Descuentos</span>
                                                <span className="text-sm font-medium text-red-400">
                                                    -{formatAmount(data.totalDiscounts)}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-zinc-700/30">
                                            <span className="text-xs text-zinc-400">Monto Neto</span>
                                            <span className="text-lg font-semibold text-emerald-200">
                                                {formatAmount(data.nomina.net_amount)}
                                            </span>
                                        </div>

                                        {data.nomina.gross_amount !== data.nomina.net_amount && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-zinc-400">Monto Bruto</span>
                                                <span className="text-sm font-medium text-zinc-300">
                                                    {formatAmount(data.nomina.gross_amount)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </ZenCardContent>
                            </ZenCard>

                            {/* Pagos parciales */}
                            {data.partialPayments && data.partialPayments.length > 0 && (
                                <ZenCard variant="outlined">
                                    <ZenCardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CreditCard className="h-4 w-4 text-blue-400" />
                                            <h3 className="text-sm font-semibold text-zinc-200">Métodos de Pago</h3>
                                        </div>
                                        <div className="space-y-2">
                                            {data.partialPayments.map((payment, index) => (
                                                <div
                                                    key={index}
                                                    className={`flex items-center justify-between py-2 ${index < data.partialPayments!.length - 1 ? 'border-b border-zinc-700/30' : ''}`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-zinc-200 capitalize">
                                                            {payment.payment_method}
                                                        </p>
                                                    </div>
                                                    <div className="text-right ml-4">
                                                        <p className="text-sm font-semibold text-zinc-200">
                                                            {formatAmount(payment.amount)}
                                                        </p>
                                                    </div>
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

            {/* Hidden Printable Version */}
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
                                }}>COMPROBANTE DE PAGO DE NÓMINA</h2>
                                <p style={{
                                    fontSize: '14px',
                                    color: '#4b5563',
                                    margin: '0 0 4px 0'
                                }}>Fecha: {formatDate(data.nomina.payment_date)}</p>
                                <p style={{
                                    fontSize: '14px',
                                    color: '#4b5563',
                                    margin: 0
                                }}>ID: {data.nomina.id.slice(0, 8)}</p>
                            </div>
                        </div>

                        {/* Personal Info */}
                        {data.personal && (
                            <div style={{ marginBottom: '36px', pageBreakInside: 'avoid' }}>
                                <h3 style={{
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#6b7280',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: '12px',
                                    marginTop: 0
                                }}>Personal</h3>
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
                                    }}>{data.personal.name}</p>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        fontSize: '14px',
                                        color: '#4b5563'
                                    }}>
                                        {data.personal.email && <span>{data.personal.email}</span>}
                                        {data.personal.phone && <span>{data.personal.phone}</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Resumen del Pago */}
                        <div style={{ marginBottom: '36px', pageBreakInside: 'avoid' }}>
                            <h3 style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                marginBottom: '16px',
                                marginTop: 0
                            }}>Resumen del Pago</h3>
                            <div style={{
                                backgroundColor: '#f9fafb',
                                padding: '20px',
                                borderRadius: '8px',
                                border: '1px solid #f3f4f6'
                            }}>
                                {data.nomina.description && (
                                    <div style={{ marginBottom: '16px' }}>
                                        <p style={{
                                            fontSize: '12px',
                                            color: '#6b7280',
                                            margin: '0 0 4px 0',
                                            fontWeight: '500'
                                        }}>Concepto</p>
                                        <p style={{
                                            fontSize: '14px',
                                            color: '#1f2937',
                                            margin: 0,
                                            wordBreak: 'break-word'
                                        }}>
                                            {data.nomina.description.replace(/consolidado/gi, '').trim()}
                                        </p>
                                    </div>
                                )}

                                {/* Conceptos Incluidos */}
                                {data.servicios.length > 0 && (
                                    <div style={{
                                        paddingTop: '16px',
                                        marginTop: '16px',
                                        borderTop: '1px solid #e5e7eb',
                                        borderLeft: '3px solid #10b981',
                                        paddingLeft: '16px'
                                    }}>
                                        <p style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#6b7280',
                                            margin: '0 0 12px 0',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>Conceptos incluidos:</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {data.servicios.map((servicio, index) => (
                                                <div key={index} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '10px 12px',
                                                    backgroundColor: '#ffffff',
                                                    borderRadius: '6px',
                                                    border: '1px solid #f3f4f6'
                                                }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            color: '#1f2937',
                                                            margin: 0,
                                                            wordBreak: 'break-word'
                                                        }}>
                                                            {servicio.service_name}
                                                            {servicio.assigned_quantity > 1 && ` x${servicio.assigned_quantity}`}
                                                        </p>
                                                        {servicio.category_name && (
                                                            <p style={{
                                                                fontSize: '12px',
                                                                color: '#6b7280',
                                                                margin: '4px 0 0 0'
                                                            }}>{servicio.category_name}</p>
                                                        )}
                                                    </div>
                                                    <div style={{
                                                        textAlign: 'right',
                                                        marginLeft: '16px',
                                                        flexShrink: 0
                                                    }}>
                                                        <p style={{
                                                            fontSize: '14px',
                                                            fontWeight: '600',
                                                            color: '#1f2937',
                                                            margin: 0,
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {formatAmount(servicio.assigned_cost)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Descuentos y Montos */}
                                <div style={{
                                    marginTop: '16px',
                                    paddingTop: '16px',
                                    borderTop: '1px solid #e5e7eb'
                                }}>
                                    {data.totalDiscounts && data.totalDiscounts > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '14px',
                                            marginBottom: '12px',
                                            gap: '16px'
                                        }}>
                                            <span style={{ color: '#6b7280', margin: 0 }}>Descuentos:</span>
                                            <span style={{ fontWeight: '500', color: '#dc2626', margin: 0, textAlign: 'right' }}>-{formatAmount(data.totalDiscounts)}</span>
                                        </div>
                                    )}
                                    <div style={{
                                        borderTop: data.totalDiscounts && data.totalDiscounts > 0 ? '1px solid #e5e7eb' : 'none',
                                        paddingTop: data.totalDiscounts && data.totalDiscounts > 0 ? '12px' : '0',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '16px',
                                        gap: '16px',
                                        marginBottom: data.nomina.gross_amount !== data.nomina.net_amount ? '8px' : '0'
                                    }}>
                                        <span style={{ fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Monto Neto:</span>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: '#16a34a',
                                            margin: 0,
                                            textAlign: 'right'
                                        }}>
                                            {formatAmount(data.nomina.net_amount)}
                                        </span>
                                    </div>
                                    {data.nomina.gross_amount !== data.nomina.net_amount && (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '14px',
                                            gap: '16px'
                                        }}>
                                            <span style={{ color: '#6b7280', margin: 0 }}>Monto Bruto:</span>
                                            <span style={{ fontWeight: '500', color: '#4b5563', margin: 0, textAlign: 'right' }}>{formatAmount(data.nomina.gross_amount)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Partial Payments */}
                        {data.partialPayments && data.partialPayments.length > 0 && (
                            <div style={{ marginBottom: '36px', pageBreakInside: 'avoid' }}>
                                <h3 style={{
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#6b7280',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: '16px',
                                    marginTop: 0
                                }}>Métodos de Pago</h3>
                                <table style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    borderCollapse: 'collapse',
                                    tableLayout: 'fixed'
                                }}>
                                    <colgroup>
                                        <col style={{ width: '50%' }} />
                                        <col style={{ width: '50%' }} />
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
                                        {data.partialPayments.map((payment, index) => (
                                            <tr key={index} style={{
                                                borderBottom: index < data.partialPayments!.length - 1 ? '1px solid #f3f4f6' : 'none'
                                            }}>
                                                <td style={{
                                                    padding: '12px 8px',
                                                    color: '#1f2937',
                                                    textTransform: 'capitalize',
                                                    fontSize: '14px'
                                                }}>{payment.payment_method}</td>
                                                <td style={{
                                                    padding: '12px 8px',
                                                    color: '#111827',
                                                    fontWeight: '600',
                                                    textAlign: 'right',
                                                    fontSize: '14px',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {formatAmount(payment.amount)}
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
                            <p style={{ fontSize: '12px', margin: 0 }}>Este documento es un comprobante de pago de nómina generado automáticamente.</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
