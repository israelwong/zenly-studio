'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ZenDialog, ZenInput, ZenButton, ZenSwitch } from '@/components/ui/zen';
import { DollarSign, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { actualizarPagoCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import { obtenerMetodosPagoManuales } from '@/lib/actions/studio/config/metodos-pago.actions';
import { toast } from 'sonner';

interface RegistroPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  cotizacionId: string;
  pagoData?: {
    concepto: string | null;
    monto: number | null;
    fecha: Date | null;
    metodo_id: string | null;
  } | null;
  onSuccess?: () => void;
}

export function RegistroPagoModal({
  isOpen,
  onClose,
  studioSlug,
  cotizacionId,
  pagoData,
  onSuccess,
}: RegistroPagoModalProps) {
  const [registrarPago, setRegistrarPago] = useState(false);
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState<Date | undefined>(undefined);
  const [metodoId, setMetodoId] = useState('');
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [metodosPago, setMetodosPago] = useState<Array<{ id: string; payment_method_name: string }>>([]);
  const [loadingMetodos, setLoadingMetodos] = useState(false);

  // Cargar métodos de pago
  const loadMetodos = useCallback(async (currentMetodoId?: string) => {
    setLoadingMetodos(true);
    try {
      const result = await obtenerMetodosPagoManuales(studioSlug);
      if (result.success && result.data) {
        const metodos = result.data.map(m => ({
          id: m.id,
          payment_method_name: m.payment_method_name,
        }));
        setMetodosPago(metodos);
        // Si no hay método seleccionado y hay métodos disponibles, seleccionar el primero
        if (!currentMetodoId && metodos.length > 0) {
          setMetodoId(metodos[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoadingMetodos(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    if (isOpen) {
      // Si hay datos previos, activar el switch y cargar datos
      const hayDatosPrevios = pagoData?.concepto || pagoData?.monto;
      const metodoIdInicial = pagoData?.metodo_id || '';
      
      setRegistrarPago(!!hayDatosPrevios);
      setConcepto(pagoData?.concepto || 'Anticipo');
      setMonto(pagoData?.monto?.toString() || '');
      setFecha(pagoData?.fecha ? new Date(pagoData.fecha) : new Date());
      setMetodoId(metodoIdInicial);
      
      // Cargar métodos de pago (pasar el método inicial para evitar selección automática si ya hay uno)
      loadMetodos(metodoIdInicial);
    } else {
      // Resetear estado cuando se cierra el modal
      setRegistrarPago(false);
      setConcepto('');
      setMonto('');
      setFecha(undefined);
      setMetodoId('');
    }
  }, [isOpen, pagoData, loadMetodos]);

  const handleConfirm = async () => {
    // Si no se va a registrar pago, guardar como promesa de pago
    if (!registrarPago) {
      setSaving(true);
      try {
        const result = await actualizarPagoCierre(
          studioSlug,
          cotizacionId,
          {
            concepto: null,
            monto: null,
            fecha: null,
            metodo_id: null,
          }
        );

        if (result.success) {
          toast.success('Se guardará con promesa de pago');
          onSuccess?.();
          onClose();
        } else {
          toast.error(result.error || 'Error al guardar');
        }
      } catch (error) {
        console.error('Error saving payment promise:', error);
        toast.error('Error al guardar');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Validaciones si se va a registrar pago
    if (!concepto.trim()) {
      toast.error('Ingresa el concepto del pago');
      return;
    }

    const montoNum = parseFloat(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    if (!fecha) {
      toast.error('Selecciona la fecha del pago');
      return;
    }

    setSaving(true);
    try {
      const result = await actualizarPagoCierre(
        studioSlug,
        cotizacionId,
        {
          concepto: concepto.trim(),
          monto: montoNum,
          fecha: fecha,
          metodo_id: metodoId || null,
        }
      );

      if (result.success) {
        toast.success('Pago registrado correctamente');
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error || 'Error al registrar pago');
      }
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Error al registrar pago');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Pago"
      description="Define si el cliente ya realizó el pago o se guardará como promesa de pago."
      maxWidth="md"
      onSave={handleConfirm}
      onCancel={onClose}
      saveLabel={saving ? 'Guardando...' : 'Guardar'}
      cancelLabel="Cancelar"
      isLoading={saving}
      zIndex={10080}
    >
      <div className="space-y-4">
        {/* Switch: Registrar pago ahora */}
        <div className="flex items-center justify-between p-3 border border-zinc-700 rounded-lg bg-zinc-900/50">
          <div className="flex-1">
            <label className="font-medium text-white text-sm block">
              Registrar pago ahora
            </label>
            <p className="text-xs text-zinc-400 mt-0.5">
              {registrarPago
                ? 'El cliente ya realizó el pago'
                : 'Se guardará con promesa de pago'}
            </p>
          </div>
          <ZenSwitch
            checked={registrarPago}
            onCheckedChange={setRegistrarPago}
            disabled={saving}
          />
        </div>

        {/* Formulario de Pago - Solo visible si registrarPago === true */}
        {registrarPago && (
          <div className="space-y-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700">
            {/* Concepto */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Concepto
              </label>
              <ZenInput
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej: Anticipo 50%"
                disabled={saving}
              />
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Monto
              </label>
              <ZenInput
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={saving}
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-1.5">
                Fecha de pago
              </label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={saving}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center justify-between"
                  >
                    <span className={!fecha ? 'text-zinc-500' : ''}>
                      {fecha ? format(fecha, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                    </span>
                    <CalendarIcon className="h-4 w-4 text-zinc-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700" align="start">
                  <Calendar
                    mode="single"
                    selected={fecha}
                    onSelect={(date) => {
                      setFecha(date);
                      setCalendarOpen(false);
                    }}
                    locale={es}
                    className="rounded-md border-0"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Método de pago */}
            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-1.5">
                Método de pago
              </label>
              {loadingMetodos ? (
                <div className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  <span className="text-sm text-zinc-400">Cargando métodos...</span>
                </div>
              ) : metodosPago.length > 0 ? (
                <select
                  value={metodoId}
                  onChange={(e) => setMetodoId(e.target.value)}
                  disabled={saving}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Seleccionar método de pago</option>
                  {metodosPago.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.payment_method_name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-500">
                  No hay métodos de pago configurados
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info adicional */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-xs text-blue-300">
            💡 Este registro es informativo para el proceso de cierre. 
            El pago formal se registrará al autorizar y crear el evento.
          </p>
        </div>
      </div>
    </ZenDialog>
  );
}

