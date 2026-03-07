'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Link2, Trash2 } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import {
    obtenerPagosHuerfanos,
    eliminarPagoHuerfano,
    type PagoHuerfano,
} from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { VincularPagoModal } from './VincularPagoModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface AuditoriaIntegridadSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studioSlug: string;
}

export function AuditoriaIntegridadSheet({ open, onOpenChange, studioSlug }: AuditoriaIntegridadSheetProps) {
    const [pagos, setPagos] = useState<PagoHuerfano[]>([]);
    const [loading, setLoading] = useState(false);
    const [vincularPagoId, setVincularPagoId] = useState<string | null>(null);
    const [eliminarPagoId, setEliminarPagoId] = useState<string | null>(null);
    const [eliminando, setEliminando] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const result = await obtenerPagosHuerfanos(studioSlug);
            if (result.success) setPagos(result.data);
            else toast.error(result.error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) load();
    }, [open, studioSlug]);

    const handleVinculado = async () => {
        setVincularPagoId(null);
        await load();
    };

    const handleEliminar = async () => {
        if (!eliminarPagoId) return;
        setEliminando(true);
        try {
            const result = await eliminarPagoHuerfano(studioSlug, eliminarPagoId);
            if (result.success) {
                toast.success('Pago eliminado');
                setEliminarPagoId(null);
                await load();
            } else {
                toast.error(result.error);
            }
        } finally {
            setEliminando(false);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-2xl bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-0"
                >
                    <SheetHeader className="border-b border-zinc-800 pb-4 px-6 pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-600/20 rounded-lg">
                                <ShieldAlert className="h-5 w-5 text-amber-400" />
                            </div>
                            <div className="flex-1">
                                <SheetTitle className="text-xl font-semibold text-white">
                                    Auditoría de Integridad
                                </SheetTitle>
                                <SheetDescription className="text-zinc-400">
                                    Pagos sin referencia a cotización o promesa. Vincula o elimina.
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="p-6 space-y-6">
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-14 bg-zinc-800/30 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : pagos.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500 rounded-lg border border-zinc-700/50 bg-zinc-800/30">
                                No hay pagos huérfanos
                            </div>
                        ) : (
                            <div className="rounded-lg border border-zinc-700 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-700 bg-zinc-800/50">
                                            <th className="text-left py-3 px-4 text-zinc-400 font-medium">Fecha</th>
                                            <th className="text-left py-3 px-4 text-zinc-400 font-medium">Concepto</th>
                                            <th className="text-right py-3 px-4 text-zinc-400 font-medium">Monto</th>
                                            <th className="text-left py-3 px-4 text-zinc-400 font-medium">Método</th>
                                            <th className="text-right py-3 px-4 text-zinc-400 font-medium w-32">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagos.map((p) => (
                                            <tr key={p.id} className="border-b border-zinc-700/50 hover:bg-zinc-800/30">
                                                <td className="py-3 px-4 text-zinc-300 whitespace-nowrap">
                                                    {format(p.created_at, 'dd MMM yyyy, HH:mm', { locale: es })}
                                                </td>
                                                <td className="py-3 px-4 text-zinc-300 truncate max-w-[180px]">
                                                    {p.concepto}
                                                </td>
                                                <td className="py-3 px-4 text-right text-emerald-400 font-medium">
                                                    {formatCurrency(p.monto)}
                                                </td>
                                                <td className="py-3 px-4 text-zinc-500">{p.metodo_pago || '—'}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <ZenButton
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setVincularPagoId(p.id)}
                                                            icon={Link2}
                                                            iconPosition="left"
                                                            className="text-xs"
                                                        >
                                                            Vincular
                                                        </ZenButton>
                                                        <ZenButton
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => setEliminarPagoId(p.id)}
                                                            icon={Trash2}
                                                            iconPosition="left"
                                                            className="text-xs"
                                                        >
                                                            Eliminar
                                                        </ZenButton>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {vincularPagoId && (
                <VincularPagoModal
                    open={!!vincularPagoId}
                    onOpenChange={(o) => !o && setVincularPagoId(null)}
                    studioSlug={studioSlug}
                    pagoId={vincularPagoId}
                    onVinculado={handleVinculado}
                />
            )}

            <ZenConfirmModal
                isOpen={!!eliminarPagoId}
                onClose={() => setEliminarPagoId(null)}
                onConfirm={handleEliminar}
                title="Eliminar pago huérfano"
                description="Este pago se borrará de forma permanente. No se puede deshacer."
                confirmText="Eliminar"
                variant="destructive"
                loading={eliminando}
                loadingText="Eliminando..."
            />
        </>
    );
}
