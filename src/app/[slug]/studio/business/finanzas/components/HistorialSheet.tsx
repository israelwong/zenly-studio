'use client';

import React, { useState, useEffect, useRef } from 'react';
import { History, ChevronLeft, ChevronRight, Download, FileText, Calendar } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from '@/components/ui/shadcn/sheet';
import { ZenButton, ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenCalendar } from '@/components/ui/zen';
import { obtenerMovimientosPorRango, type Transaction } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { MovimientoItemCard } from './MovimientoItemCard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange, SelectRangeEventHandler } from 'react-day-picker';
import { toast } from 'sonner';

interface HistorialSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studioSlug: string;
}

export function HistorialSheet({ open, onOpenChange, studioSlug }: HistorialSheetProps) {
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempRange, setTempRange] = useState<DateRange | undefined>(undefined);
    const [filterMode, setFilterMode] = useState<'month' | 'range'>('month');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    // Calcular rango del mes actual por defecto
    useEffect(() => {
        if (open && filterMode === 'month') {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
            setDateRange({ from: start, to: end });
        }
    }, [open, currentMonth, filterMode]);

    // Cargar transacciones cuando cambia el rango
    useEffect(() => {
        if (!open || !dateRange?.from || !dateRange?.to) return;

        const loadTransactions = async () => {
            setLoading(true);
            try {
                const result = await obtenerMovimientosPorRango(
                    studioSlug,
                    dateRange.from!,
                    dateRange.to!
                );
                if (result.success && result.data) {
                    setTransactions(result.data);
                }
            } catch (error) {
                console.error('Error cargando historial:', error);
            } finally {
                setLoading(false);
            }
        };

        loadTransactions();
    }, [open, dateRange, studioSlug]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    const calcularTotales = () => {
        const ingresos = transactions
            .filter((t) => t.monto > 0)
            .reduce((sum, t) => sum + t.monto, 0);
        const egresos = transactions
            .filter((t) => t.monto < 0)
            .reduce((sum, t) => sum + Math.abs(t.monto), 0);
        const balance = ingresos - egresos;
        return { ingresos, egresos, balance };
    };

    const { ingresos, egresos, balance } = calcularTotales();

    const handlePreviousMonth = () => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentMonth(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentMonth(newDate);
    };

    const handleApplyDateRange = () => {
        if (!tempRange?.from || !tempRange?.to) {
            toast.error('Selecciona un rango de fechas válido');
            return;
        }
        setDateRange(tempRange);
        setCalendarOpen(false);
    };

    const handleCancelDateRange = () => {
        setTempRange(dateRange);
        setCalendarOpen(false);
    };

    const handleExportPDF = async () => {
        if (!reportRef.current) return;

        setGeneratingPdf(true);
        try {
            const { jsPDF } = await import('jspdf');
            const html2canvas = (await import('html2canvas')).default;

            // Clone and strip all classes/attributes that reference Tailwind
            const clone = reportRef.current.cloneNode(true) as HTMLElement;
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

            const filename = `historial-financiero-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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

    const handleExportCSV = () => {
        const headers = ['Fecha', 'Concepto', 'Categoría', 'Fuente', 'Monto'];
        const rows = transactions.map((t) => [
            format(t.fecha, 'dd/MM/yyyy HH:mm', { locale: es }),
            t.concepto,
            t.categoria,
            t.fuente,
            t.monto.toString(),
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
            '',
            `Ingresos,${ingresos}`,
            `Egresos,${egresos}`,
            `Balance,${balance}`,
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute(
            'download',
            `historial-financiero-${format(new Date(), 'yyyy-MM-dd')}.csv`
        );
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-2xl bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-0"
                >
                    <SheetHeader className="border-b border-zinc-800 pb-4 px-6 pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-600/20 rounded-lg">
                                <History className="h-5 w-5 text-green-400" />
                            </div>
                            <div className="flex-1">
                                <SheetTitle className="text-xl font-semibold text-white">
                                    Historial de Transacciones
                                </SheetTitle>
                                <SheetDescription className="text-zinc-400">
                                    Consulta y descarga el historial financiero
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="p-6 space-y-6">
                        {/* Filtros */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <ZenButton
                                    variant={filterMode === 'month' ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setFilterMode('month')}
                                >
                                    Por Mes
                                </ZenButton>
                                <ZenButton
                                    variant={filterMode === 'range' ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setFilterMode('range')}
                                >
                                    Por Rango
                                </ZenButton>
                            </div>

                            {filterMode === 'month' ? (
                                <div className="flex items-center gap-2">
                                    <ZenButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={handlePreviousMonth}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </ZenButton>
                                    <div className="flex-1 text-center px-4 py-2 bg-zinc-800/50 rounded-lg">
                                        <span className="text-sm font-semibold text-zinc-200 capitalize">
                                            {currentMonth.toLocaleDateString('es-ES', {
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                    <ZenButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleNextMonth}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </ZenButton>
                                </div>
                            ) : (
                                <Popover
                                    open={calendarOpen}
                                    onOpenChange={(isOpen) => {
                                        setCalendarOpen(isOpen);
                                        if (isOpen) {
                                            setTempRange(dateRange);
                                        }
                                    }}
                                >
                                    <PopoverTrigger asChild>
                                        <ZenButton
                                            variant="outline"
                                            className="w-full justify-start"
                                            icon={Calendar}
                                            iconPosition="left"
                                        >
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(dateRange.from, 'dd MMM', { locale: es })} -{' '}
                                                        {format(dateRange.to, 'dd MMM', { locale: es })}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, 'dd MMM', { locale: es })
                                                )
                                            ) : (
                                                'Seleccionar rango de fechas'
                                            )}
                                        </ZenButton>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-auto p-0 bg-zinc-900 border-zinc-700"
                                        align="start"
                                    >
                                        <div className="p-3">
                                            <ZenCalendar
                                                mode="range"
                                                defaultMonth={tempRange?.from || dateRange?.from}
                                                numberOfMonths={2}
                                                locale={es}
                                                className="rounded-lg border shadow-sm"
                                                {...(tempRange && { selected: tempRange })}
                                                {...(setTempRange && { onSelect: setTempRange as SelectRangeEventHandler })}
                                            />
                                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                                                <ZenButton
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleCancelDateRange}
                                                >
                                                    Cancelar
                                                </ZenButton>
                                                <ZenButton
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={handleApplyDateRange}
                                                    disabled={!tempRange?.from || !tempRange?.to}
                                                >
                                                    Aplicar rango
                                                </ZenButton>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>

                        {/* Totales */}
                        <div className="grid grid-cols-3 gap-4">
                            <ZenCard variant="default" padding="sm">
                                <ZenCardContent className="p-4">
                                    <p className="text-xs text-zinc-500 mb-1">Ingresos</p>
                                    <p className="text-lg font-semibold text-emerald-400">
                                        {formatCurrency(ingresos)}
                                    </p>
                                </ZenCardContent>
                            </ZenCard>
                            <ZenCard variant="default" padding="sm">
                                <ZenCardContent className="p-4">
                                    <p className="text-xs text-zinc-500 mb-1">Egresos</p>
                                    <p className="text-lg font-semibold text-rose-400">
                                        {formatCurrency(egresos)}
                                    </p>
                                </ZenCardContent>
                            </ZenCard>
                            <ZenCard variant="default" padding="sm">
                                <ZenCardContent className="p-4">
                                    <p className="text-xs text-zinc-500 mb-1">Balance</p>
                                    <p
                                        className={`text-lg font-semibold ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                            }`}
                                    >
                                        {formatCurrency(balance)}
                                    </p>
                                </ZenCardContent>
                            </ZenCard>
                        </div>

                        {/* Lista de transacciones */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-zinc-300">
                                Transacciones ({transactions.length})
                            </h3>
                            {loading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="h-20 bg-zinc-800/30 rounded-lg animate-pulse"
                                        />
                                    ))}
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">
                                    <p>No hay transacciones en el período seleccionado</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {transactions.map((transaction) => (
                                        <MovimientoItemCard
                                            key={transaction.id}
                                            transaction={transaction}
                                            studioSlug={studioSlug}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <SheetFooter className="border-t border-zinc-800 px-6 py-4 gap-2">
                        <ZenButton
                            variant="outline"
                            onClick={handleExportCSV}
                            icon={Download}
                            iconPosition="left"
                            className="flex-1"
                        >
                            Descargar CSV
                        </ZenButton>
                        <ZenButton
                            variant="primary"
                            onClick={handleExportPDF}
                            icon={FileText}
                            iconPosition="left"
                            className="flex-1"
                            disabled={generatingPdf}
                        >
                            {generatingPdf ? 'Generando...' : 'Descargar PDF'}
                        </ZenButton>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Contenedor oculto para PDF */}
            <div ref={reportRef} className="hidden">
                <div style={{ padding: '40px', background: 'white', color: 'black', fontFamily: 'Arial, sans-serif' }}>
                    {/* Header */}
                    <div style={{ borderBottom: '3px solid #10b981', paddingBottom: '20px', marginBottom: '30px' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1f2937' }}>
                            Historial Financiero
                        </h1>
                        <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#6b7280' }}>
                            <div>
                                <strong>Período:</strong>{' '}
                                {filterMode === 'month'
                                    ? format(currentMonth, 'MMMM yyyy', { locale: es })
                                    : dateRange?.from && dateRange?.to
                                        ? `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`
                                        : ''}
                            </div>
                            <div>
                                <strong>Generado:</strong> {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </div>
                            <div>
                                <strong>Total transacciones:</strong> {transactions.length}
                            </div>
                        </div>
                    </div>

                    {/* Resumen Financiero */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '30px' }}>
                        <div style={{
                            border: '2px solid #10b981',
                            borderRadius: '8px',
                            padding: '20px',
                            background: '#f0fdf4',
                            textAlign: 'center'
                        }}>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Ingresos
                            </p>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', margin: 0 }}>
                                {formatCurrency(ingresos)}
                            </p>
                        </div>
                        <div style={{
                            border: '2px solid #ef4444',
                            borderRadius: '8px',
                            padding: '20px',
                            background: '#fef2f2',
                            textAlign: 'center'
                        }}>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Egresos
                            </p>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>
                                {formatCurrency(egresos)}
                            </p>
                        </div>
                        <div style={{
                            border: `2px solid ${balance >= 0 ? '#10b981' : '#ef4444'}`,
                            borderRadius: '8px',
                            padding: '20px',
                            background: balance >= 0 ? '#f0fdf4' : '#fef2f2',
                            textAlign: 'center'
                        }}>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Balance
                            </p>
                            <p style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                color: balance >= 0 ? '#059669' : '#dc2626',
                                margin: 0
                            }}>
                                {formatCurrency(balance)}
                            </p>
                        </div>
                    </div>

                    {/* Tabla de Transacciones */}
                    <div style={{ marginTop: '30px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0', color: '#1f2937' }}>
                            Detalle de Transacciones
                        </h2>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            overflow: 'hidden'
                        }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{
                                        textAlign: 'left',
                                        padding: '12px 16px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#374151',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Fecha
                                    </th>
                                    <th style={{
                                        textAlign: 'left',
                                        padding: '12px 16px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#374151',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Concepto
                                    </th>
                                    <th style={{
                                        textAlign: 'left',
                                        padding: '12px 16px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#374151',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Categoría
                                    </th>
                                    <th style={{
                                        textAlign: 'right',
                                        padding: '12px 16px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#374151',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Monto
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{
                                            textAlign: 'center',
                                            padding: '40px 16px',
                                            color: '#9ca3af',
                                            fontSize: '14px'
                                        }}>
                                            No hay transacciones en el período seleccionado
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((t, index) => (
                                        <tr
                                            key={t.id}
                                            style={{
                                                borderBottom: index < transactions.length - 1 ? '1px solid #e5e7eb' : 'none',
                                                background: index % 2 === 0 ? 'white' : '#f9fafb'
                                            }}
                                        >
                                            <td style={{
                                                padding: '12px 16px',
                                                fontSize: '13px',
                                                color: '#374151'
                                            }}>
                                                {format(t.fecha, 'dd/MM/yyyy', { locale: es })}
                                                <br />
                                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                    {format(t.fecha, 'HH:mm', { locale: es })}
                                                </span>
                                            </td>
                                            <td style={{
                                                padding: '12px 16px',
                                                fontSize: '13px',
                                                color: '#1f2937',
                                                fontWeight: '500'
                                            }}>
                                                {t.concepto}
                                            </td>
                                            <td style={{
                                                padding: '12px 16px',
                                                fontSize: '13px',
                                                color: '#6b7280'
                                            }}>
                                                {t.categoria}
                                            </td>
                                            <td style={{
                                                padding: '12px 16px',
                                                textAlign: 'right',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: t.monto >= 0 ? '#059669' : '#dc2626'
                                            }}>
                                                {t.monto >= 0 ? '+' : ''}
                                                {formatCurrency(Math.abs(t.monto))}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {transactions.length > 0 && (
                                <tfoot>
                                    <tr style={{
                                        background: '#f9fafb',
                                        borderTop: '2px solid #e5e7eb',
                                        fontWeight: 'bold'
                                    }}>
                                        <td colSpan={3} style={{
                                            padding: '16px',
                                            textAlign: 'right',
                                            fontSize: '13px',
                                            color: '#374151'
                                        }}>
                                            Total:
                                        </td>
                                        <td style={{
                                            padding: '16px',
                                            textAlign: 'right',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            color: balance >= 0 ? '#059669' : '#dc2626'
                                        }}>
                                            {formatCurrency(balance)}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Footer */}
                    <div style={{
                        marginTop: '40px',
                        paddingTop: '20px',
                        borderTop: '1px solid #e5e7eb',
                        fontSize: '11px',
                        color: '#9ca3af',
                        textAlign: 'center'
                    }}>
                        <p style={{ margin: '4px 0' }}>
                            Este documento fue generado automáticamente el {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                        <p style={{ margin: '4px 0' }}>
                            ZEN Platform - Sistema de Gestión Financiera
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
