"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import {
    Download,
    Eye,
    CheckCircle,
    Clock,
    XCircle,
    Calendar,
    CreditCard
} from 'lucide-react';
import { SuscripcionData } from '@/lib/actions/studio/account/suscripcion/types';

interface BillingHistoryCardProps {
    data: SuscripcionData;
}

export function BillingHistoryCard({ data }: BillingHistoryCardProps) {
    const { billing_history } = data;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid': return <CheckCircle className="h-4 w-4 text-green-400" />;
            case 'pending': return <Clock className="h-4 w-4 text-yellow-400" />;
            case 'failed': return <XCircle className="h-4 w-4 text-red-400" />;
            default: return <Clock className="h-4 w-4 text-zinc-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-900/30 text-green-300 border-green-800';
            case 'pending': return 'bg-yellow-900/30 text-yellow-300 border-yellow-800';
            case 'failed': return 'bg-red-900/30 text-red-300 border-red-800';
            default: return 'bg-zinc-900/30 text-zinc-300 border-zinc-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'paid': return 'Pagado';
            case 'pending': return 'Pendiente';
            case 'failed': return 'Fallido';
            default: return status;
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    };

    const formatPrice = (amount: number, currency: string) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    if (billing_history.length === 0) {
        return (
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-400" />
                        Historial de Facturación
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-32 text-zinc-500">
                        <div className="text-center">
                            <CreditCard className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                            <p>No hay historial de facturación</p>
                            <p className="text-sm">Las facturas aparecerán aquí</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-400" />
                    Historial de Facturación
                </CardTitle>
            </CardHeader>

            <CardContent>
                <div className="space-y-3">
                    {billing_history.map((bill) => (
                        <div
                            key={bill.id}
                            className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:bg-zinc-800/70 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                        {getStatusIcon(bill.status)}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-medium">
                                                {bill.description}
                                            </span>
                                            <Badge
                                                className={`text-xs ${getStatusColor(bill.status)}`}
                                            >
                                                {getStatusText(bill.status)}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-zinc-400">
                                            {formatDate(bill.created_at)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className="text-white font-medium">
                                            {formatPrice(bill.amount, bill.currency)}
                                        </div>
                                        <div className="text-zinc-400 text-sm">
                                            {bill.currency}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                                            title="Ver detalles"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                                            title="Descargar factura"
                                        >
                                            <Download className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {billing_history.length > 5 && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                        <button className="w-full py-2 text-zinc-400 hover:text-white text-sm transition-colors">
                            Ver más facturas
                        </button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
