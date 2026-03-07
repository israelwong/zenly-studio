'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/shadcn/dialog';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Search, Link2 } from 'lucide-react';
import { buscarCotizacionesParaVincular, vincularPagoManualmente, type CotizacionParaVincular } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { toast } from 'sonner';

interface VincularPagoModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studioSlug: string;
    pagoId: string;
    onVinculado: () => void | Promise<void>;
}

export function VincularPagoModal({
    open,
    onOpenChange,
    studioSlug,
    pagoId,
    onVinculado,
}: VincularPagoModalProps) {
    const [search, setSearch] = useState('');
    const [cotizaciones, setCotizaciones] = useState<CotizacionParaVincular[]>([]);
    const [loading, setLoading] = useState(false);
    const [linking, setLinking] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await buscarCotizacionesParaVincular(studioSlug, search || undefined);
            if (result.success) setCotizaciones(result.data);
            else toast.error(result.error);
        } finally {
            setLoading(false);
        }
    }, [studioSlug, search]);

    useEffect(() => {
        if (open) {
            setSearch('');
            setSelectedId(null);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const t = setTimeout(load, search ? 300 : 0);
        return () => clearTimeout(t);
    }, [search, open, load]);

    const handleVincular = async () => {
        if (!selectedId) {
            toast.error('Elige una cotización');
            return;
        }
        setLinking(true);
        try {
            const result = await vincularPagoManualmente(studioSlug, pagoId, selectedId);
            if (result.success) {
                toast.success('Pago vinculado correctamente');
                onOpenChange(false);
                await onVinculado();
            } else {
                toast.error(result.error);
            }
        } finally {
            setLinking(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-700">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <Link2 className="h-5 w-5 text-emerald-400" />
                        Vincular pago a cotización
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Busca una cotización activa del estudio para asociar este pago. Se actualizarán cotización, promesa y evento si aplica.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    <ZenInput
                        label="Buscar por nombre de cotización o promesa"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Escribe para filtrar..."
                        icon={Search}
                        iconPosition="left"
                    />
                    <div className="max-h-[280px] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800/50">
                        {loading ? (
                            <div className="p-6 text-center text-zinc-500 text-sm">Cargando...</div>
                        ) : cotizaciones.length === 0 ? (
                            <div className="p-6 text-center text-zinc-500 text-sm">
                                No hay cotizaciones que coincidan
                            </div>
                        ) : (
                            <ul className="divide-y divide-zinc-700">
                                {cotizaciones.map((c) => (
                                    <li key={c.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                                            className={`w-full px-4 py-3 text-left hover:bg-zinc-700/50 transition-colors ${
                                                selectedId === c.id ? 'bg-emerald-600/20 border-l-2 border-emerald-500' : ''
                                            }`}
                                        >
                                            <p className="font-medium text-zinc-200 truncate">{c.name}</p>
                                            {c.promise_name && (
                                                <p className="text-xs text-zinc-500 truncate">Promesa: {c.promise_name}</p>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <ZenButton variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            variant="primary"
                            onClick={handleVincular}
                            loading={linking}
                            disabled={!selectedId}
                            icon={Link2}
                            iconPosition="left"
                        >
                            Vincular
                        </ZenButton>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
