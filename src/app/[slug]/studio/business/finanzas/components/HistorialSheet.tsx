'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { History, ChevronLeft, ChevronRight, Download, FileText, Calendar, ArrowUp, ArrowDown, XCircle } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/shadcn/tooltip';
import { ZenCalendar } from '@/components/ui/zen';
import { obtenerMovimientosPorRango, type Transaction } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { MovimientoItemCard } from './MovimientoItemCard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange, SelectRangeEventHandler } from 'react-day-picker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HistorialSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studioSlug: string;
}

export function HistorialSheet({ open, onOpenChange, studioSlug }: HistorialSheetProps) {
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | null>(null);
    const [tempRange, setTempRange] = useState<DateRange | undefined>(undefined);
    const [monthPopoverOpen, setMonthPopoverOpen] = useState(false);
    const [rangePopoverOpen, setRangePopoverOpen] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open && !customRange) {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            setDateRange({ from: new Date(year, month, 1), to: new Date(year, month + 1, 0, 23, 59, 59, 999) });
        } else if (open && customRange) {
            setDateRange(customRange);
        }
    }, [open, currentMonth, customRange]);

    const loadTransactions = useCallback(async () => {
        if (!dateRange?.from || !dateRange?.to) return;
        setLoading(true);
        try {
            const result = await obtenerMovimientosPorRango(
                studioSlug,
                dateRange.from,
                dateRange.to
            );
            if (result.success && result.data) {
                setTransactions(result.data);
            }
        } catch (error) {
            console.error('Error cargando historial:', error);
        } finally {
            setLoading(false);
        }
    }, [dateRange?.from, dateRange?.to, studioSlug]);

    useEffect(() => {
        if (!open || !dateRange?.from || !dateRange?.to) return;
        loadTransactions();
    }, [open, dateRange, studioSlug, loadTransactions]);

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
        setCustomRange({ from: tempRange.from, to: tempRange.to });
        setDateRange(tempRange);
        setRangePopoverOpen(false);
        setTempRange(undefined);
    };

    const clearCustomRange = () => {
        setCustomRange(null);
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        setDateRange({ from: new Date(year, month, 1), to: new Date(year, month + 1, 0, 23, 59, 59, 999) });
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
                    className="w-full max-w-[450px] bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-0"
                >
                    <SheetHeader className="border-b border-zinc-800 pb-3 px-6 pt-4">
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

                    <div className="pt-2 px-6 pb-6 space-y-4">
                        {/* Esqueleto: selector + balance + transacciones */}
                        {loading ? (
                            <>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="h-8 w-[180px] rounded-md bg-zinc-800/50 animate-pulse" />
                                    <div className="h-8 w-[120px] rounded-md bg-zinc-800/30 animate-pulse" />
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4 space-y-3">
                                    <div className="h-3 w-28 bg-zinc-700/50 rounded animate-pulse" />
                                    <div className="h-8 w-32 bg-zinc-700/50 rounded animate-pulse" />
                                    <div className="flex gap-4">
                                        <div className="h-4 w-20 bg-zinc-700/40 rounded animate-pulse" />
                                        <div className="h-4 w-20 bg-zinc-700/40 rounded animate-pulse" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-4 w-32 bg-zinc-800/50 rounded animate-pulse" />
                                    <div className="space-y-2">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
                                                <div className="h-10 w-10 rounded-lg bg-zinc-700/50 animate-pulse shrink-0" />
                                                <div className="flex-1 space-y-1.5 min-w-0">
                                                    <div className="h-3.5 w-3/4 bg-zinc-700/50 rounded animate-pulse" />
                                                    <div className="h-3 w-1/2 bg-zinc-700/40 rounded animate-pulse" />
                                                </div>
                                                <div className="h-5 w-16 bg-zinc-700/50 rounded animate-pulse shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                        {/* Selector de fecha (homólogo al header de Finanzas) */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {customRange ? (
                                <div className="flex items-center gap-0 h-8 rounded-md border border-emerald-500/60 bg-emerald-950/50 overflow-hidden">
                                    <div className="flex items-center gap-1 h-8 px-2 min-w-0">
                                        <span className="text-sm font-semibold text-emerald-400 truncate">
                                            {format(customRange.from, 'dd MMM yyyy', { locale: es })} – {format(customRange.to, 'dd MMM yyyy', { locale: es })}
                                        </span>
                                        <ZenButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearCustomRange}
                                            aria-label="Quitar rango"
                                            className="h-8 w-8 p-0 shrink-0"
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </ZenButton>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-0 h-8 rounded-md border border-emerald-500/60 bg-emerald-950/50 overflow-hidden">
                                        <ZenButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={handlePreviousMonth}
                                            aria-label="Mes anterior"
                                            className="h-8 w-8 p-0 text-emerald-200 hover:text-emerald-100 bg-transparent shrink-0"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </ZenButton>
                                        <Popover open={monthPopoverOpen} onOpenChange={setMonthPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="h-8 flex items-center justify-center px-2 min-w-[120px] text-center text-sm font-semibold capitalize text-emerald-100 hover:bg-emerald-900/40 transition-colors"
                                                >
                                                    {currentMonth.toLocaleDateString('es-ES', {
                                                        month: 'long',
                                                        year: 'numeric',
                                                    }).replace(' de ', ' ')}
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-4 bg-zinc-900 border-zinc-800" align="center">
                                                <div className="grid grid-cols-3 gap-1 text-sm">
                                                    {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => (
                                                        <ZenButton
                                                            key={m}
                                                            variant={currentMonth.getMonth() === i ? 'default' : 'ghost'}
                                                            size="sm"
                                                            className="h-8"
                                                            onClick={() => {
                                                                const d = new Date(currentMonth);
                                                                d.setMonth(i);
                                                                setCurrentMonth(d);
                                                                setMonthPopoverOpen(false);
                                                            }}
                                                        >
                                                            {m}
                                                        </ZenButton>
                                                    ))}
                                                </div>
                                                <div className="flex items-center justify-center gap-1 border-t border-zinc-800 pt-2 mt-2">
                                                    <ZenButton variant="ghost" size="sm" onClick={() => { const d = new Date(currentMonth); d.setFullYear(d.getFullYear() - 1); setCurrentMonth(d); }}>-</ZenButton>
                                                    <span className="text-sm font-medium text-zinc-200 min-w-[4rem] text-center">{currentMonth.getFullYear()}</span>
                                                    <ZenButton variant="ghost" size="sm" onClick={() => { const d = new Date(currentMonth); d.setFullYear(d.getFullYear() + 1); setCurrentMonth(d); }}>+</ZenButton>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <ZenButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleNextMonth}
                                            aria-label="Mes siguiente"
                                            className="h-8 w-8 p-0 text-emerald-200 hover:text-emerald-100 bg-transparent shrink-0"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </ZenButton>
                                    </div>
                                    <Popover open={rangePopoverOpen} onOpenChange={(o) => { setRangePopoverOpen(o); if (!o) setTempRange(undefined); }}>
                                        <PopoverTrigger asChild>
                                            <ZenButton variant="outline" size="sm" className="h-8" icon={Calendar} iconPosition="left">
                                                Definir Rango
                                            </ZenButton>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-4 bg-zinc-900 border-zinc-800" align="end">
                                            <ZenCalendar
                                                mode="range"
                                                defaultMonth={tempRange?.from ?? dateRange?.from ?? currentMonth}
                                                selected={tempRange}
                                                onSelect={setTempRange as SelectRangeEventHandler}
                                                numberOfMonths={2}
                                            />
                                            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-zinc-800">
                                                <ZenButton variant="ghost" size="sm" onClick={() => setRangePopoverOpen(false)}>Cancelar</ZenButton>
                                                <ZenButton size="sm" onClick={handleApplyDateRange} disabled={!tempRange?.from || !tempRange?.to}>Aplicar</ZenButton>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </>
                            )}
                        </div>

                        {/* Balance del periodo (alta densidad: una tarjeta con indicadores) */}
                        <ZenCard variant="default" padding="none">
                            <ZenCardContent className="px-4 py-3">
                                <p className="text-sm text-zinc-400 mb-1">Balance del periodo</p>
                                <p className={cn('text-2xl font-bold', balance >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                                    {formatCurrency(balance)}
                                </p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded text-sm text-emerald-400">
                                                <ArrowUp className="h-3.5 w-3.5 shrink-0" />
                                                {formatCurrency(ingresos)}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs">
                                            Ingresos
                                        </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded text-sm text-red-400">
                                                <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                                                {formatCurrency(egresos)}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs">
                                            Egresos
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </ZenCardContent>
                        </ZenCard>

                        {/* Lista de transacciones */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-zinc-300">
                                Transacciones ({transactions.length})
                            </h3>
                            {transactions.length === 0 ? (
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
                                            onCancelarPago={async (id) => {
                                                try {
                                                    const { cancelarPago } = await import('@/lib/actions/studio/business/events/payments.actions');
                                                    const result = await cancelarPago(studioSlug, id);
                                                    if (result.success) await loadTransactions();
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                            }}
                                            onGastoEliminado={loadTransactions}
                                            onNominaCancelada={loadTransactions}
                                            onDevolucionConfirmada={loadTransactions}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                            </>
                        )}
                    </div>

                    <SheetFooter className="border-t border-zinc-800 px-6 py-4 flex flex-row gap-2">
                        <ZenButton
                            variant="outline"
                            onClick={handleExportCSV}
                            icon={Download}
                            iconPosition="left"
                            className="w-1/2"
                        >
                            Descargar CSV
                        </ZenButton>
                        <ZenButton
                            variant="primary"
                            onClick={handleExportPDF}
                            icon={FileText}
                            iconPosition="left"
                            className="w-1/2"
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
                                {customRange
                                    ? `${format(customRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(customRange.to, 'dd/MM/yyyy', { locale: es })}`
                                    : format(currentMonth, 'MMMM yyyy', { locale: es })}
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
                            Zenly Studio - Sistema de Gestión Financiera
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
