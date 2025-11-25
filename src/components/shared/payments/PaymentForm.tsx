'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, FileText, CreditCard } from 'lucide-react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { obtenerMetodosPago } from '@/lib/actions/studio/config/metodos-pago.actions';

interface PaymentFormData {
  amount: number;
  metodo_pago: string;
  concept: string;
  description?: string;
  payment_date: Date;
}

interface PaymentFormProps {
  studioSlug: string;
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
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: PaymentFormProps) {
  const [amount, setAmount] = useState<string>(initialData?.amount.toString() || '');
  const [metodoPago, setMetodoPago] = useState<string>(initialData?.payment_method || '');
  const [concept, setConcept] = useState<string>(initialData?.concept || '');
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    if (initialData?.payment_date) {
      const date = new Date(initialData.payment_date);
      return date.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  const [metodosPago, setMetodosPago] = useState<Array<{ id: string; payment_method_name: string }>>([]);
  const [loadingMetodos, setLoadingMetodos] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadMetodos = async () => {
      setLoadingMetodos(true);
      try {
        const result = await obtenerMetodosPago(studioSlug);
        if (result.success && result.data) {
          setMetodosPago(result.data.map(m => ({
            id: m.id,
            payment_method_name: m.payment_method_name,
          })));
          if (!initialData && result.data.length > 0) {
            setMetodoPago(result.data[0].payment_method_name);
          }
        }
      } catch (error) {
        console.error('Error loading payment methods:', error);
      } finally {
        setLoadingMetodos(false);
      }
    };

    loadMetodos();
  }, [studioSlug, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
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
      payment_date: new Date(paymentDate),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Monto */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Monto *
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
        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Método de pago *
        </label>
        {loadingMetodos ? (
          <div className="h-10 bg-zinc-800 rounded animate-pulse" />
        ) : (
          <select
            value={metodoPago}
            onChange={(e) => {
              setMetodoPago(e.target.value);
              if (errors.metodoPago) setErrors(prev => ({ ...prev, metodoPago: '' }));
            }}
            disabled={loading}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Selecciona un método</option>
            {metodosPago.map((metodo) => (
              <option key={metodo.id} value={metodo.payment_method_name}>
                {metodo.payment_method_name}
              </option>
            ))}
          </select>
        )}
        {errors.metodoPago && (
          <p className="text-xs text-red-400">{errors.metodoPago}</p>
        )}
      </div>

      {/* Fecha de pago */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Fecha de pago *
        </label>
        <ZenInput
          type="date"
          value={paymentDate}
          onChange={(e) => {
            setPaymentDate(e.target.value);
            if (errors.paymentDate) setErrors(prev => ({ ...prev, paymentDate: '' }));
          }}
          error={errors.paymentDate}
          disabled={loading}
        />
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
    </form>
  );
}

