'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, User, Mail, Phone } from 'lucide-react';
import {
    ZenDialog,
    ZenButton,
    ZenInput,
} from '@/components/ui/zen';
import { PaymentMethodRadio } from '@/components/shared/payments/PaymentMethodRadio';
import { crearPago } from '@/lib/actions/studio/business/events/payments.actions';
import { obtenerMetodosPagoManuales } from '@/lib/actions/studio/config/metodos-pago.actions';

interface PagoRapidoModalProps {
    open: boolean;
    onClose: () => void;
    cotizacionId: string;
    promiseId?: string;
    studioSlug: string;
    montoPendiente: number;
    precioCotizacion?: number;
    descuentoCotizacion?: number;
    totalCotizacion?: number;
    pagosRealizados?: number;
    concepto: string;
    promiseName?: string;
    promiseEventDate?: Date | null;
    promiseContactName?: string;
    promiseContactEmail?: string | null;
    promiseContactPhone?: string | null;
    onSuccess?: () => void;
}

export function PagoRapidoModal({
    open,
    onClose,
    cotizacionId,
    promiseId,
    studioSlug,
    montoPendiente,
    precioCotizacion,
    descuentoCotizacion,
    totalCotizacion,
    pagosRealizados,
    concepto,
    promiseName,
    promiseEventDate,
    promiseContactName,
    promiseContactEmail,
    promiseContactPhone,
    onSuccess,
}: PagoRapidoModalProps) {
    const [monto, setMonto] = useState('');
    const [metodoPago, setMetodoPago] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [metodosPago, setMetodosPago] = useState<Array<{ id: string; payment_method_name: string; payment_method: string | null }>>([]);
    const [loadingMetodos, setLoadingMetodos] = useState(true);

    useEffect(() => {
        if (open) {
            loadMetodosPago();
        }
    }, [open, studioSlug]);

    const loadMetodosPago = async () => {
        setLoadingMetodos(true);
        try {
            const result = await obtenerMetodosPagoManuales(studioSlug);
            if (result.success && result.data) {
                const metodos = result.data.map(m => ({
                    id: m.id,
                    payment_method_name: m.payment_method_name,
                    payment_method: m.payment_method,
                }));
                setMetodosPago(metodos);
                if (metodos.length > 0) {
                    setMetodoPago(metodos[0].payment_method_name);
                }
            }
        } catch (error) {
            console.error('Error loading payment methods:', error);
        } finally {
            setLoadingMetodos(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    const formatDate = (date: Date | null | undefined) => {
        if (!date) return 'No definida';
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        }).format(new Date(date));
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }
        if (!monto || parseFloat(monto) <= 0) {
            setError('El monto debe ser mayor a 0');
            return;
        }

        if (parseFloat(monto) > montoPendiente) {
            setError(`El monto no puede ser mayor a ${formatCurrency(montoPendiente)}`);
            return;
        }

        if (!metodoPago) {
            setError('Selecciona un método de pago');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await crearPago({
                studio_slug: studioSlug,
                cotizacion_id: cotizacionId,
                promise_id: promiseId,
                amount: parseFloat(monto),
                metodo_pago: metodoPago,
                concept: concepto || `Pago rápido - ${formatCurrency(parseFloat(monto))}`,
            });

            if (result.success) {
                setMonto('');
                setMetodoPago('');
                setError(null);
                await onSuccess?.();
                onClose();
            } else {
                setError(result.error || 'Error al registrar pago');
            }
        } catch (err) {
            setError('Error al registrar pago');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ZenDialog
            isOpen={open}
            onClose={() => {
                setMonto('');
                setMetodoPago('');
                setError(null);
                onClose();
            }}
            title="Registrar Pago Rápido"
            description={`Monto pendiente: ${formatCurrency(montoPendiente)}`}
            onSave={handleSave}
            onCancel={onClose}
            saveLabel="Registrar Pago"
            cancelLabel="Cancelar"
            isLoading={loading}
            maxWidth="md"
        >
            <div className="space-y-4">
                {/* Información de la promesa */}
                {promiseName && (
                    <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-2">
                        <h4 className="text-sm font-semibold text-zinc-200 mb-2">Información del Evento</h4>
                        <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                <span className="text-zinc-400">Evento:</span>
                                <span className="text-zinc-300 font-medium">{promiseName}</span>
                            </div>
                            {promiseEventDate && (
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                    <span className="text-zinc-400">Fecha:</span>
                                    <span className="text-zinc-300">{formatDate(promiseEventDate)}</span>
                                </div>
                            )}
                            {promiseContactName && (
                                <div className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 text-zinc-400" />
                                    <span className="text-zinc-400">Contacto:</span>
                                    <span className="text-zinc-300">{promiseContactName}</span>
                                </div>
                            )}
                            {promiseContactEmail && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5 text-zinc-400" />
                                    <span className="text-zinc-400">Email:</span>
                                    <span className="text-zinc-300">{promiseContactEmail}</span>
                                </div>
                            )}
                            {promiseContactPhone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-zinc-400" />
                                    <span className="text-zinc-400">Teléfono:</span>
                                    <span className="text-zinc-300">{promiseContactPhone}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Desglose de cotización */}
                {precioCotizacion !== undefined && (
                    <div className="space-y-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                        <h4 className="text-sm font-semibold text-zinc-200 mb-2">Desglose de Cotización</h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-zinc-400">Precio:</span>
                                <p className="text-zinc-300 font-medium mt-0.5">
                                    {formatCurrency(precioCotizacion)}
                                </p>
                            </div>
                            {descuentoCotizacion && descuentoCotizacion > 0 && (
                                <div>
                                    <span className="text-zinc-400">Descuento:</span>
                                    <p className="text-rose-400 font-medium mt-0.5">
                                        -{formatCurrency(descuentoCotizacion)}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="pt-2 border-t border-zinc-800">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400">Total cotización:</span>
                                <span className="text-zinc-300 font-semibold">
                                    {formatCurrency(totalCotizacion!)}
                                </span>
                            </div>
                            {pagosRealizados! > 0 && (
                                <div className="flex items-center justify-between text-xs mt-1">
                                    <span className="text-zinc-400">Pagos realizados:</span>
                                    <span className="text-emerald-400 font-medium">
                                        {formatCurrency(pagosRealizados!)}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-zinc-800">
                                <span className="text-zinc-300 font-medium">Pendiente:</span>
                                <span className="text-emerald-400 font-semibold">
                                    {formatCurrency(montoPendiente)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Monto a pagar */}
                <div>
                    <label className="text-sm font-medium text-zinc-200 mb-2 block">
                        Monto a pagar
                    </label>
                    <ZenInput
                        type="number"
                        value={monto}
                        onChange={(e) => {
                            setMonto(e.target.value);
                            if (error) setError(null);
                        }}
                        placeholder="0.00"
                        step="0.01"
                        min="0.01"
                        max={montoPendiente.toString()}
                        required
                    />
                </div>

                {/* Método de pago */}
                <div>
                    <label className="text-sm font-medium text-zinc-200 mb-2 block">
                        Método de pago
                    </label>
                    {loadingMetodos ? (
                        <div className="space-y-2">
                            <div className="h-12 bg-zinc-800 rounded animate-pulse" />
                        </div>
                    ) : metodosPago.length === 0 ? (
                        <p className="text-sm text-zinc-400">No hay métodos de pago configurados</p>
                    ) : (
                        <div className="space-y-2">
                            {metodosPago.map((metodo) => (
                                <PaymentMethodRadio
                                    key={metodo.id}
                                    id={`metodo-${metodo.id}`}
                                    name="metodoPago"
                                    value={metodo.payment_method_name}
                                    label={metodo.payment_method_name}
                                    checked={metodoPago === metodo.payment_method_name}
                                    onChange={(value) => {
                                        setMetodoPago(value);
                                        if (error) setError(null);
                                    }}
                                    disabled={loading}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {error && (
                    <p className="text-sm text-rose-400">{error}</p>
                )}
            </div>
        </ZenDialog>
    );
}
