'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MoreVertical, Eye, DollarSign, ArrowUp } from 'lucide-react';
import {
    ZenCard,
    ZenCardContent,
    ZenButton,
    ZenDropdownMenu,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
} from '@/components/ui/zen';
import { PagoRapidoModal } from './PagoRapidoModal';

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

interface PorCobrarItemCardProps {
    item: PendingItem;
    studioSlug: string;
    onRegistrarPago: (id: string) => void;
    onPagoRegistrado?: () => void;
    /** inline = fila compacta dentro de lista por mes (estilo Por pagar) */
    variant?: 'card' | 'inline';
}

export function PorCobrarItemCard({
    item,
    studioSlug,
    onRegistrarPago,
    onPagoRegistrado,
    variant = 'card',
}: PorCobrarItemCardProps) {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: 'short',
        }).format(date);
    };

    const handleVerDetalles = () => {
        if (item.promiseId) {
            router.push(`/${studioSlug}/studio/commercial/promises/${item.promiseId}`);
        }
    };

    const handlePagoRegistrado = () => {
        setShowModal(false);
        onPagoRegistrado?.();
    };

    if (variant === 'inline') {
        const eventDate = item.promiseEventDate ? formatDate(item.promiseEventDate instanceof Date ? item.promiseEventDate : new Date(item.promiseEventDate)) : null;
        return (
            <>
                <div className="flex items-center justify-between gap-2 py-3 px-2 pl-3 hover:bg-zinc-700/20 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5 text-left">
                        <p className="text-sm font-medium text-zinc-200 truncate w-full">{item.concepto}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5 text-xs text-zinc-500">
                            <ArrowUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden />
                            <span className="text-sm text-emerald-400 font-semibold">{formatCurrency(item.monto)}</span>
                            {eventDate != null && <span>{eventDate}</span>}
                            {item.promiseEventTypeName != null && item.promiseEventTypeName !== '' && (
                                <span className="px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400">{item.promiseEventTypeName}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <ZenButton
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setShowModal(true)}
                        >
                            Cobrar
                        </ZenButton>
                        <ZenDropdownMenu>
                            <ZenDropdownMenuTrigger asChild>
                                <ZenButton variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-200" aria-label="Opciones">
                                    <MoreVertical className="h-4 w-4" />
                                </ZenButton>
                            </ZenDropdownMenuTrigger>
                            <ZenDropdownMenuContent align="end">
                                <ZenDropdownMenuItem onClick={handleVerDetalles} className="gap-2">
                                    <Eye className="h-4 w-4" />
                                    Ir a Evento
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuItem onClick={() => setShowModal(true)} className="gap-2">
                                    <DollarSign className="h-4 w-4 text-emerald-400" />
                                    Registrar Pago
                                </ZenDropdownMenuItem>
                            </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                    </div>
                </div>
                <PagoRapidoModal
                    open={showModal}
                    onClose={() => setShowModal(false)}
                    cotizacionId={item.id}
                    promiseId={item.promiseId}
                    studioSlug={studioSlug}
                    montoPendiente={item.monto}
                    precioCotizacion={item.precioCotizacion}
                    descuentoCotizacion={item.descuentoCotizacion}
                    totalCotizacion={item.totalCotizacion}
                    pagosRealizados={item.pagosRealizados}
                    concepto={item.concepto}
                    promiseName={item.promiseName}
                    promiseEventDate={item.promiseEventDate}
                    promiseContactName={item.promiseContactName}
                    promiseContactEmail={item.promiseContactEmail}
                    promiseContactPhone={item.promiseContactPhone}
                    onSuccess={handlePagoRegistrado}
                />
            </>
        );
    }

    return (
        <>
            <ZenCard variant="default" padding="sm" className="hover:border-zinc-700 transition-colors cursor-pointer">
                <ZenCardContent className="p-0">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-200 mb-0.5 truncate">
                                {item.concepto}
                            </p>
                            <div className="flex items-center gap-3 flex-wrap">
                                <ArrowUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden />
                                <p className="text-base text-emerald-400 font-semibold">
                                    {formatCurrency(item.monto)}
                                </p>
                                <p className="text-xs text-zinc-500">
                                    {formatDate(item.fecha)}
                                </p>
                            </div>
                        </div>
                        <ZenDropdownMenu>
                            <ZenDropdownMenuTrigger asChild>
                                <ZenButton variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                </ZenButton>
                            </ZenDropdownMenuTrigger>
                            <ZenDropdownMenuContent align="end">
                                <ZenDropdownMenuItem onClick={handleVerDetalles} className="gap-2">
                                    <Eye className="h-4 w-4" />
                                    Ir a Evento
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuItem onClick={() => setShowModal(true)} className="gap-2">
                                    <DollarSign className="h-4 w-4 text-emerald-400" />
                                    Registrar Pago
                                </ZenDropdownMenuItem>
                            </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                    </div>
                </ZenCardContent>
            </ZenCard>

            <PagoRapidoModal
                open={showModal}
                onClose={() => setShowModal(false)}
                cotizacionId={item.id}
                promiseId={item.promiseId}
                studioSlug={studioSlug}
                montoPendiente={item.monto}
                precioCotizacion={item.precioCotizacion}
                descuentoCotizacion={item.descuentoCotizacion}
                totalCotizacion={item.totalCotizacion}
                pagosRealizados={item.pagosRealizados}
                concepto={item.concepto}
                promiseName={item.promiseName}
                promiseEventDate={item.promiseEventDate}
                promiseContactName={item.promiseContactName}
                promiseContactEmail={item.promiseContactEmail}
                promiseContactPhone={item.promiseContactPhone}
                onSuccess={handlePagoRegistrado}
            />
        </>
    );
}
