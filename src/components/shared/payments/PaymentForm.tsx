'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CalendarIcon, DollarSign, FileText, CreditCard, Settings } from 'lucide-react';
import { ZenButton, ZenInput, ZenCalendar, type ZenCalendarProps } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { obtenerMetodosPagoManuales } from '@/lib/actions/studio/config/metodos-pago.actions';
import { PaymentMethodRadio } from './PaymentMethodRadio';
import { PaymentMethodsModal } from './PaymentMethodsModal';
import { es } from 'date-fns/locale';
import { formatDisplayDate } from '@/lib/utils/date-formatter';

// Tipo específico para ZenCalendar con mode="single"
type ZenCalendarSingleProps = Omit<ZenCalendarProps, 'mode' | 'selected' | 'onSelect'> & {
  mode: 'single';
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
};

interface PaymentFormData {
  amount: number;
  metodo_pago: string;
  concept: string;
  description?: string;
  payment_date: Date;
}

interface PaymentFormProps {
  studioSlug: string;
  montoPendiente?: number;
  initialData?: {
    id: string;
    amount: number;
    payment_method: string;
    payment_date: Date;
    concept: string;
    description?: string | null;
  };
  onSubmit: (data: PaymentFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function PaymentForm({
  studioSlug,
  montoPendiente,
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: PaymentFormProps) {
  const [amount, setAmount] = useState<string>(initialData?.amount.toString() || '');
  const [metodoPago, setMetodoPago] = useState<string>(initialData?.payment_method || '');
  const [concept, setConcept] = useState<string>(initialData?.concept || '');
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(() => {
    if (initialData?.payment_date) {
      // Normalizar fecha inicial usando métodos UTC para evitar problemas de zona horaria
      const date = initialData.payment_date instanceof Date 
        ? initialData.payment_date 
        : new Date(initialData.payment_date);
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
    }
    // Usar fecha actual en UTC con mediodía como buffer
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [metodosPago, setMetodosPago] = useState<Array<{ id: string; payment_method_name: string; payment_method: string | null }>>([]);
  const [loadingMetodos, setLoadingMetodos] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showMethodsModal, setShowMethodsModal] = useState(false);

  const loadMetodos = useCallback(async () => {
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
        if (!initialData && metodos.length > 0) {
          setMetodoPago(metodos[0].payment_method_name);
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoadingMetodos(false);
    }
  }, [studioSlug, initialData]);

  useEffect(() => {
    loadMetodos();
  }, [loadMetodos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }

    // Validar contra monto pendiente si se proporciona
    if (montoPendiente !== undefined) {
      const amountValue = parseFloat(amount);
      // Si es edición, permitir el monto actual del pago + el monto pendiente
      const maxAllowed = initialData
        ? montoPendiente + initialData.amount
        : montoPendiente;

      if (amountValue > maxAllowed) {
        const formatCurrency = (value: number) => {
          return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
          }).format(value);
        };
        newErrors.amount = `El monto no puede ser mayor a ${formatCurrency(maxAllowed)}`;
      }
    }

    if (!metodoPago) {
      newErrors.metodoPago = 'Selecciona un método de pago';
    }

    if (!concept.trim()) {
      newErrors.concept = 'El concepto es requerido';
    }

    if (!paymentDate) {
      newErrors.paymentDate = 'La fecha es requerida';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    await onSubmit({
      amount: parseFloat(amount),
      metodo_pago: metodoPago,
      concept: concept.trim(),
      description: description.trim() || undefined,
      payment_date: paymentDate!,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Monto */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Monto *
          </span>
          {montoPendiente !== undefined && (
            <span className="text-xs text-amber-400 font-medium">
              {initialData
                ? `Disponible: ${new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                }).format(montoPendiente)}`
                : `Pendiente: ${new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                }).format(montoPendiente)}`}
            </span>
          )}
        </label>
        <ZenInput
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
          }}
          placeholder="0.00"
          error={errors.amount}
          disabled={loading}
        />
      </div>

      {/* Método de pago */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Método de pago *
          </label>
          {metodosPago.length === 0 && !loadingMetodos && (
            <ZenButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMethodsModal(true)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Gestionar métodos
            </ZenButton>
          )}
        </div>
        {loadingMetodos ? (
          <div className="space-y-2">
            <div className="h-12 bg-zinc-800 rounded animate-pulse" />
            <div className="h-12 bg-zinc-800 rounded animate-pulse" />
          </div>
        ) : metodosPago.length === 0 ? (
          <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-800/30 text-center">
            <CreditCard className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
            <p className="text-sm text-zinc-400 mb-3">
              No hay métodos de pago configurados
            </p>
            <ZenButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setShowMethodsModal(true)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Gestionar métodos de pago
            </ZenButton>
          </div>
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
                  if (errors.metodoPago) setErrors(prev => ({ ...prev, metodoPago: '' }));
                }}
                disabled={loading}
              />
            ))}
          </div>
        )}
        {errors.metodoPago && (
          <p className="text-xs text-red-400">{errors.metodoPago}</p>
        )}
      </div>

      {/* Fecha de pago */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          Fecha de pago *
        </label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <ZenButton
              type="button"
              variant="outline"
              icon={CalendarIcon}
              iconPosition="left"
              className="w-full justify-start"
              disabled={loading}
            >
              {paymentDate ? new Intl.DateTimeFormat('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }).format(paymentDate) : 'Seleccionar fecha'}
            </ZenButton>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 bg-zinc-900 border-zinc-700"
            align="start"
            side="bottom"
            sideOffset={4}
            style={{ zIndex: 100000 } as React.CSSProperties}
          >
            <ZenCalendar
              {...({
                mode: 'single' as const,
                selected: paymentDate,
                onSelect: (selectedDate: Date | undefined) => {
                  if (selectedDate) {
                    // Normalizar fecha seleccionada usando métodos UTC con mediodía como buffer
                    const normalizedDate = new Date(Date.UTC(
                      selectedDate.getUTCFullYear(),
                      selectedDate.getUTCMonth(),
                      selectedDate.getUTCDate(),
                      12, 0, 0
                    ));
                    setPaymentDate(normalizedDate);
                    setCalendarOpen(false);
                    if (errors.paymentDate) setErrors(prev => ({ ...prev, paymentDate: '' }));
                  }
                },
                locale: es,
              } as ZenCalendarSingleProps)}
            />
          </PopoverContent>
        </Popover>
        {errors.paymentDate && (
          <p className="text-xs text-red-400">{errors.paymentDate}</p>
        )}
      </div>

      {/* Concepto */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Concepto *
        </label>
        <ZenInput
          type="text"
          value={concept}
          onChange={(e) => {
            setConcept(e.target.value);
            if (errors.concept) setErrors(prev => ({ ...prev, concept: '' }));
          }}
          placeholder="Ej: Abono inicial, Pago parcial, etc."
          error={errors.concept}
          disabled={loading}
        />
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Descripción (opcional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notas adicionales sobre el pago"
          disabled={loading}
          className="w-full min-h-[80px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Botones */}
      <div className="flex items-center gap-2 pt-4">
        <ZenButton
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancelar
        </ZenButton>
        <ZenButton
          type="submit"
          variant="primary"
          disabled={loading}
          loading={loading}
          className="flex-1"
        >
          {initialData ? 'Actualizar' : 'Crear'} pago
        </ZenButton>
      </div>

      {/* Modal de gestión de métodos */}
      <PaymentMethodsModal
        isOpen={showMethodsModal}
        onClose={() => setShowMethodsModal(false)}
        studioSlug={studioSlug}
        onSuccess={() => {
          loadMetodos();
        }}
      />
    </form>
  );
}

