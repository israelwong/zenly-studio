'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, DollarSign, FileText, Download, Calendar } from 'lucide-react';
import { ZenDialog, ZenButton, ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { obtenerDatosComprobanteRecurrente, type RecurrenteReceiptData } from '@/lib/actions/studio/business/finanzas/recurrente-receipt.actions';
import { formatDate, formatNumber } from '@/lib/actions/utils/formatting';
import { toast } from 'sonner';

interface RecurrenteReceiptProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    gastoId: string;
}

const formatAmount = (amount: number): string => {
    return `$${formatNumber(amount, 2)}`;
};

export function RecurrenteReceipt({
    isOpen,
    onClose,
    studioSlug,
    gastoId,
}: RecurrenteReceiptProps) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<RecurrenteReceiptData | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const printableRef = useRef<HTMLDivElement>(null);
    const previousGastoIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (isOpen && gastoId && gastoId !== previousGastoIdRef.current) {
            previousGastoIdRef.current = gastoId;
            setLoading(true);
            setData(null);

            const loadReceiptData = async () => {
                try {
                    const result = await obtenerDatosComprobanteRecurrente(studioSlug, gastoId);
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
            previousGastoIdRef.current = null;
            setData(null);
            setLoading(false);
        }
    }, [isOpen, gastoId, studioSlug, onClose]);

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
            pdf.save(`comprobante-recurrente-${data.gasto.id.slice(0, 8)}.pdf`);

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
                title="Comprobante de Pago Recurrente"
                description="Detalles del comprobante de pago recurrente"
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Skeleton className="h-6 w-32 bg-zinc-800 animate-pulse" />
                                    <Skeleton className="h-4 w-full bg-zinc-800 animate-pulse" />
                                    <Skeleton className="h-4 w-3/4 bg-zinc-800 animate-pulse" />
                                </div>
                                <div className="space-y-3">
                                    <Skeleton className="h-6 w-32 bg-zinc-800 animate-pulse" />
                                    <Skeleton className="h-4 w-full bg-zinc-800 animate-pulse" />
                                    <Skeleton className="h-4 w-3/4 bg-zinc-800 animate-pulse" />
                                </div>
                            </div>
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
                                                <p className="text-sm font-medium text-zinc-100">{formatDate(data.gasto.date)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-zinc-400 mb-1">Método de Pago</p>
                                                <p className="text-sm font-medium text-zinc-100 capitalize">
                                                    {data.gasto.payment_method || 'transferencia'}
                                                </p>
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
                                        {data.gasto.description && (
                                            <div>
                                                <p className="text-xs text-zinc-400 mb-1">Concepto</p>
                                                <p className="text-sm text-zinc-300">
                                                    {data.gasto.description}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-zinc-700/30">
                                            <span className="text-xs text-zinc-400">Monto Pagado</span>
                                            <span className="text-lg font-semibold text-emerald-200">
                                                {formatAmount(data.gasto.amount)}
                                            </span>
                                        </div>
                                    </div>
                                </ZenCardContent>
                            </ZenCard>
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
                                }}>COMPROBANTE DE PAGO RECURRENTE</h2>
                                <p style={{
                                    fontSize: '14px',
                                    color: '#4b5563',
                                    margin: '0 0 4px 0'
                                }}>Fecha: {formatDate(data.gasto.date)}</p>
                                <p style={{
                                    fontSize: '14px',
                                    color: '#4b5563',
                                    margin: 0
                                }}>ID: {data.gasto.id.slice(0, 8)}</p>
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
                                {data.gasto.description && (
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
                                            {data.gasto.description}
                                        </p>
                                    </div>
                                )}

                                <div style={{
                                    marginTop: '16px',
                                    paddingTop: '16px',
                                    borderTop: '1px solid #e5e7eb'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '16px',
                                        gap: '16px'
                                    }}>
                                        <span style={{ fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Monto Pagado:</span>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: '#16a34a',
                                            margin: 0,
                                            textAlign: 'right'
                                        }}>
                                            {formatAmount(data.gasto.amount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

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
                            <p style={{ fontSize: '12px', margin: 0 }}>Este documento es un comprobante de pago recurrente generado automáticamente.</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
