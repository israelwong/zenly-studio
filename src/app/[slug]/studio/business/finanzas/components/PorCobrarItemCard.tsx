'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MoreVertical, Eye, DollarSign } from 'lucide-react';
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
    promiseContactName?: string;
    promiseContactEmail?: string | null;
    promiseContactPhone?: string | null;
}

interface PorCobrarItemCardProps {
    item: PendingItem;
    studioSlug: string;
    onRegistrarPago: (id: string) => void;
    onPagoRegistrado?: () => void;
}

export function PorCobrarItemCard({
    item,
    studioSlug,
    onRegistrarPago,
    onPagoRegistrado,
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

    return (
        <>
            <ZenCard variant="default" padding="sm" className="hover:border-zinc-700 transition-colors">
                <ZenCardContent className="p-0">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-200 mb-0.5 truncate">
                                {item.concepto}
                            </p>
                            <div className="flex items-center gap-3 flex-wrap">
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
