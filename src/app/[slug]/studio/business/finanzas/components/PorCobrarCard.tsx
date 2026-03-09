'use client';

import React, { useMemo } from 'react';
import { ArrowUp, ChevronDown, ChevronRight } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Accordion, AccordionContent, AccordionHeader, AccordionItem, AccordionTrigger } from '@/components/ui/shadcn/accordion';
import { PorCobrarItemCard } from './PorCobrarItemCard';

interface PendingItem {
    id: string;
    concepto: string;
    monto: number;
    fecha: Date;
    precioCotizacion?: number;
    descuentoCotizacion?: number;
    totalCotizacion?: number;
    pagosRealizados?: number;
    promiseId?: string;
    promiseName?: string;
    promiseEventDate?: Date | null;
    promiseEventTypeName?: string | null;
    promiseContactName?: string;
    promiseContactEmail?: string | null;
    promiseContactPhone?: string | null;
}

interface PorCobrarCardProps {
    porCobrar: PendingItem[];
    studioSlug: string;
    onRegistrarPago: (id: string) => void;
    onPagoRegistrado?: () => void;
}

/** Clave de mes para agrupar: año-mes. Mes de recepción = mes de la fecha del evento (pago 2 días antes). */
function getMonthKey(item: PendingItem): string {
    const d = item.promiseEventDate;
    if (!d) return 'sin-fecha';
    const date = d instanceof Date ? d : new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function getMonthLabel(key: string): string {
    if (key === 'sin-fecha') return 'Sin fecha de evento';
    const [y, m] = key.split('-');
    const monthIndex = parseInt(m, 10) - 1;
    const date = new Date(parseInt(y, 10), monthIndex, 1);
    return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(date);
}

export function PorCobrarCard({
    porCobrar,
    studioSlug,
    onRegistrarPago,
    onPagoRegistrado,
}: PorCobrarCardProps) {
    const totalPorCobrar = porCobrar.reduce((sum, i) => sum + i.monto, 0);

    const byMonth = useMemo(() => {
        const map = new Map<string, PendingItem[]>();
        for (const item of porCobrar) {
            const key = getMonthKey(item);
            const list = map.get(key) ?? [];
            list.push(item);
            map.set(key, list);
        }
        const keys = Array.from(map.keys()).sort((a, b) => {
            if (a === 'sin-fecha') return 1;
            if (b === 'sin-fecha') return -1;
            return a.localeCompare(b);
        });
        return { map, keys };
    }, [porCobrar]);

    const defaultOpen = useMemo(() => byMonth.keys, [byMonth.keys]);

    return (
        <ZenCard variant="default" padding="none" className="h-full flex flex-col">
            <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0 h-14 px-4 flex items-center">
                <div className="flex items-center justify-between gap-2 w-full min-w-0">
                    <ZenCardTitle className="text-base mb-0 truncate flex-1 min-w-0 flex items-center gap-2">
                        <span className="truncate">Por cobrar</span>
                    </ZenCardTitle>
                    {totalPorCobrar > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded text-sm text-emerald-400 shrink-0">
                            <ArrowUp className="h-3.5 w-3.5 shrink-0" />
                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalPorCobrar)}
                        </span>
                    )}
                </div>
            </ZenCardHeader>
            <ZenCardContent className="p-0 flex-1 overflow-auto">
                {porCobrar.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">
                        <p>No hay cuentas por cobrar</p>
                    </div>
                ) : (
                    <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-0">
                        {byMonth.keys.map((monthKey) => {
                            const items = byMonth.map.get(monthKey) ?? [];
                            const total = items.reduce((s, i) => s + i.monto, 0);
                            const label = getMonthLabel(monthKey);
                            const value = monthKey;
                            return (
                                <div key={monthKey} className="overflow-hidden">
                                    <AccordionItem value={value} className="border-0 mb-0">
                                        <AccordionHeader className="flex">
                                            <AccordionTrigger className="w-full flex items-center justify-between py-4 pl-2.5 pr-4 hover:bg-zinc-800/50 hover:no-underline transition-colors bg-zinc-800/30 group">
                                                <div className="flex items-center gap-3">
                                                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 group-data-[state=closed]:inline group-data-[state=open]:hidden" />
                                                    <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 group-data-[state=open]:inline group-data-[state=closed]:hidden" />
                                                    <h4 className="font-semibold text-white capitalize">{label}</h4>
                                                </div>
                                                <span className="text-xs font-semibold text-emerald-400 shrink-0">
                                                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total)}
                                                </span>
                                            </AccordionTrigger>
                                        </AccordionHeader>
                                        <AccordionContent className="pt-0">
                                            <div className="bg-zinc-900/50">
                                                <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-4">
                                                    {items.map((item, idx) => (
                                                        <div
                                                            key={item.id}
                                                            className={idx === 0 ? 'border-t-0 border-b border-zinc-700/30' : 'border-t border-b border-zinc-700/30'}
                                                        >
                                                            <PorCobrarItemCard
                                                                item={item}
                                                                studioSlug={studioSlug}
                                                                onRegistrarPago={onRegistrarPago}
                                                                onPagoRegistrado={onPagoRegistrado}
                                                                variant="inline"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </div>
                            );
                        })}
                    </Accordion>
                )}
            </ZenCardContent>
        </ZenCard>
    );
}
